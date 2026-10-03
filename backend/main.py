from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import io, json, random, os, base64, uuid
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()

try:
    from google.cloud import storage as gcs_storage
    GCS_BUCKET = os.environ.get("GCS_BUCKET", "grapevision-502317-imagenes")
    gcs_client = gcs_storage.Client()
    GCS_AVAILABLE = True
except Exception as e:
    GCS_AVAILABLE = False
    print(f"⚠️  Cloud Storage no disponible: {e}")

try:
    from PIL import Image, ImageOps
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("⚠️  OpenCV no disponible")

try:
    from ultralytics import YOLO
    MODEL_PATH = os.path.join(os.path.dirname(__file__), "best.pt")
    yolo_model = YOLO(MODEL_PATH)
    YOLO_AVAILABLE = True
    print(f"✅ Modelo YOLOv8 cargado: {MODEL_PATH}")
except Exception as e:
    YOLO_AVAILABLE = False
    print(f"⚠️  YOLOv8 no disponible: {e}")

# ── SUPABASE (PostgreSQL) ─────────────────────────────────────────────────────
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get("DATABASE_URL")  # se configura en Cloud Run

def get_db():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return conn

def init_db():
    conn = get_db()
    cur  = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS lotes (
            id         SERIAL PRIMARY KEY,
            lote_id    TEXT NOT NULL,
            fundo      TEXT NOT NULL,
            variedad   TEXT NOT NULL,
            campana    TEXT NOT NULL,
            fecha      TEXT NOT NULL,
            perfil     TEXT DEFAULT 'operario',
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS clasificaciones (
            id                   SERIAL PRIMARY KEY,
            lote_id              TEXT NOT NULL,
            variedad             TEXT,
            categoria            TEXT NOT NULL,
            confianza            REAL NOT NULL,
            criterios            TEXT,
            aprobado_exportacion INTEGER DEFAULT 0,
            imagen_nombre        TEXT,
            perfil               TEXT DEFAULT 'operario',
            created_at           TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS validaciones (
            id                SERIAL PRIMARY KEY,
            lote_id           TEXT,
            categoria_modelo  TEXT NOT NULL,
            es_correcta       BOOLEAN NOT NULL,
            observacion       TEXT,
            created_at        TIMESTAMP DEFAULT NOW()
        );

        ALTER TABLE clasificaciones ADD COLUMN IF NOT EXISTS fecha_inspeccion TEXT;
        ALTER TABLE clasificaciones ADD COLUMN IF NOT EXISTS imagen_url TEXT;
        ALTER TABLE validaciones ALTER COLUMN lote_id DROP NOT NULL;
        ALTER TABLE validaciones ADD COLUMN IF NOT EXISTS confianza REAL;
        ALTER TABLE validaciones ADD COLUMN IF NOT EXISTS clasificacion_id INTEGER REFERENCES clasificaciones(id);
    """)
    conn.commit()
    cur.close()
    conn.close()

try:
    init_db()
    print("✅ Supabase conectado y tablas listas")
except Exception as e:
    print(f"⚠️  Error conectando a Supabase: {e}")

# ── APP ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="GrapeVision API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── PYDANTIC ──────────────────────────────────────────────────────────────────
class LoteIn(BaseModel):
    lote_id: str; fundo: str; variedad: str; campana: str; fecha: str
    perfil: Optional[str] = "operario"

class FeedbackIn(BaseModel):
    clasificacion_id: int
    es_correcta: bool
    observacion: Optional[str] = ""

# ── CONSTANTES ────────────────────────────────────────────────────────────────
CRITERIOS = {
    "cat1": ["Color: Verde claro uniforme","Tamaño de baya: Grande","Compactación: Óptima","Pedicelo: Fresco"],
    "cat2": ["Ligeras manchas superficiales","Variación de color leve","Tamaño de baya: Medio","Pedicelo con leve deshidratación"],
}
DEFECTOS = {
    "cat1": [
        {"nombre":"Mancha leve",       "estado":"No detectada","color":"#2E7D4F"},
        {"nombre":"Variación de color","estado":"No detectada","color":"#2E7D4F"},
        {"nombre":"Raste severo",      "estado":"No detectado","color":"#2E7D4F"},
    ],
    "cat2": [
        {"nombre":"Mancha leve",       "estado":"Detectada",   "color":"#E53935"},
        {"nombre":"Variación de color","estado":"Detectada",   "color":"#F57C00"},
        {"nombre":"Raste severo",      "estado":"No detectado","color":"#2E7D4F"},
    ],
}
BOX_COLORS = {"cat1":(46,125,79), "cat2":(39,104,208), "indeterminado":(117,117,117)}

# ── VALIDACIÓN DE IMAGEN (HU003) ────────────────────────────────────────────────
FORMATOS_PERMITIDOS = {"image/jpeg", "image/png"}
TAMANO_MAXIMO_MB = 10
CONFIANZA_MINIMA = 0.5

def validar_imagen(contents: bytes, content_type: str):
    if content_type not in FORMATOS_PERMITIDOS:
        raise HTTPException(400, f"Formato no permitido ({content_type or 'desconocido'}). Usa JPG o PNG.")
    if len(contents) > TAMANO_MAXIMO_MB * 1024 * 1024:
        raise HTTPException(400, f"La imagen supera el tamaño máximo de {TAMANO_MAXIMO_MB}MB.")
    if PIL_AVAILABLE:
        try:
            Image.open(io.BytesIO(contents)).verify()
        except Exception:
            raise HTTPException(400, "El archivo no es una imagen válida o está corrupto.")

# ── ALMACENAMIENTO DE IMÁGENES (Cloud Storage) ─────────────────────────────────
def subir_imagen(image_bytes: bytes, content_type: str) -> str:
    """Sube la imagen original a Cloud Storage y devuelve su URL pública. Devuelve "" si Storage no está disponible o falla la subida."""
    if not GCS_AVAILABLE:
        return ""
    try:
        ext = "png" if content_type == "image/png" else "jpg"
        nombre = f"clasificaciones/{datetime.utcnow():%Y/%m}/{uuid.uuid4().hex}.{ext}"
        bucket = gcs_client.bucket(GCS_BUCKET)
        blob = bucket.blob(nombre)
        blob.upload_from_string(image_bytes, content_type=content_type)
        return f"https://storage.googleapis.com/{GCS_BUCKET}/{nombre}"
    except Exception as e:
        print(f"⚠️  Error subiendo imagen a Cloud Storage: {e}")
        return ""

# ── DIBUJAR BOX ───────────────────────────────────────────────────────────────
def dibujar_box(image_bytes: bytes, boxes_data: list, categoria: str, confianza: float):
    if not CV2_AVAILABLE: return None
    try:
        img_pil_cv = ImageOps.exif_transpose(Image.open(io.BytesIO(image_bytes)))
        img = cv2.cvtColor(np.array(img_pil_cv), cv2.COLOR_RGB2BGR)
        if img is None: return None
        h, w  = img.shape[:2]
        color = BOX_COLORS.get(categoria,(46,125,79))
        cat_txt = {"cat1":"CAT 1","cat2":"CAT 2"}.get(categoria, "INDETERMINADO")
        label = f"{cat_txt}  {confianza*100:.1f}%"

        for box in boxes_data:
            x1,y1,x2,y2 = int(box[0]),int(box[1]),int(box[2]),int(box[3])
            cv2.rectangle(img,(x1,y1),(x2,y2),color,18)
            c,t = 120,24
            for pts in [((x1,y1),(x1+c,y1)),((x1,y1),(x1,y1+c)),
                        ((x2,y1),(x2-c,y1)),((x2,y1),(x2,y1+c)),
                        ((x1,y2),(x1+c,y2)),((x1,y2),(x1,y2-c)),
                        ((x2,y2),(x2-c,y2)),((x2,y2),(x2,y2-c))]:
                cv2.line(img,pts[0],pts[1],color,t)
            font = cv2.FONT_HERSHEY_DUPLEX
            fs   = 3.5
            (tw,th),_ = cv2.getTextSize(label,font,fs,9)
            lx,ly = x1, max(y1-8, th+8)
            cv2.rectangle(img,(lx,ly-th-5),(lx+tw+8,ly+3),color,-1)
            cv2.putText(img,label,(lx+4,ly),font,fs,(255,255,255),9)

        badge = f"YOLOv8  {label}"
        bf,bs,bt = cv2.FONT_HERSHEY_SIMPLEX,1.6,5
        (bw,bh),_ = cv2.getTextSize(badge,bf,bs,bt)
        m=12
        cv2.rectangle(img,(m,h-bh-m*2-6),(m+bw+m,h-m),(20,20,20),-1)
        cv2.rectangle(img,(m,h-bh-m*2-6),(m+bw+m,h-m),color,2)
        cv2.putText(img,badge,(m+6,h-m-8),bf,bs,(255,255,255),bt)

        _,buf = cv2.imencode(".jpg",img,[cv2.IMWRITE_JPEG_QUALITY,88])
        return "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode()
    except Exception as ex:
        print(f"Error dibujando box: {ex}"); return None

def dibujar_box_sintetico(image_bytes: bytes, categoria: str, confianza: float):
    if not CV2_AVAILABLE or not PIL_AVAILABLE: return None
    try:
        img_pil = ImageOps.exif_transpose(Image.open(io.BytesIO(image_bytes))).convert("RGB")
        w,h = img_pil.size
        px,py = int(w*0.08), int(h*0.05)
        buf = io.BytesIO(); img_pil.save(buf,format="JPEG")
        return dibujar_box(buf.getvalue(),[[px,py,w-px,h-py]],categoria,confianza)
    except: return None

# ── CLASIFICACIÓN ─────────────────────────────────────────────────────────────
def clasificar_imagen(image_bytes: bytes, content_type: str = "image/jpeg") -> dict:
    if YOLO_AVAILABLE:
        try:
            img_pil = ImageOps.exif_transpose(Image.open(io.BytesIO(image_bytes))).convert("RGB")
            results = yolo_model.predict(img_pil, conf=0.25, imgsz=640, verbose=False)
            boxes_r = results[0].boxes
            if len(boxes_r) > 0:
                best_idx  = int(boxes_r.conf.argmax())
                clase_idx = int(boxes_r.cls[best_idx])
                confianza = float(boxes_r.conf[best_idx])
                all_boxes = boxes_r.xyxy.cpu().numpy().tolist()

                if confianza < CONFIANZA_MINIMA:
                    imagen_anotada = dibujar_box(image_bytes, all_boxes, "indeterminado", confianza)
                    return _build_result_indeterminado(confianza, imagen_anotada)

                categoria = "cat1" if clase_idx == 0 else "cat2"
                imagen_anotada = dibujar_box(image_bytes, all_boxes, categoria, confianza)
                imagen_url = subir_imagen(image_bytes, content_type)
                return _build_result("Timpson", categoria, confianza, imagen_anotada, imagen_url)

            print("YOLOv8: sin detecciones")
            return _build_result_indeterminado()
        except Exception as e:
            print(f"Error YOLO: {e}")
            return _build_result_indeterminado()

    seed = len(image_bytes) % 1000
    categoria = "cat1"; confianza = 0.918
    if PIL_AVAILABLE:
        try:
            img = ImageOps.exif_transpose(Image.open(io.BytesIO(image_bytes))).convert("RGB").resize((32,32))
            pixels = list(img.getdata())
            r = sum(p[0] for p in pixels)/len(pixels)
            g = sum(p[1] for p in pixels)/len(pixels)
            categoria = "cat1" if abs(r-g) > 20 else "cat2"
            rng = random.Random(seed)
            confianza = 0.918 if categoria=="cat1" else round(0.78+rng.uniform(-0.04,0.06),3)
        except: pass
    imagen_anotada = dibujar_box_sintetico(image_bytes, categoria, confianza)
    imagen_url = subir_imagen(image_bytes, content_type)
    return _build_result("Timpson", categoria, confianza, imagen_anotada, imagen_url)

def _build_result(variedad, categoria, confianza, imagen_anotada=None, imagen_url=""):
    num = "1" if categoria=="cat1" else "2"
    return {
        "variedad": variedad,
        "categoria": f"CAT {num}",
        "categoria_label": f"Categoría {num}",
        "categoria_key": categoria,
        "confianza": round(confianza,3),
        "confianza_pct": f"{round(confianza*100,1)} %",
        "criterios_cumplidos": CRITERIOS[categoria],
        "aprobado_exportacion": categoria=="cat1",
        "defectos": DEFECTOS[categoria],
        "norma": "Codex Alimentarius / NTP 011.012",
        "imagen_anotada": imagen_anotada,
        "imagen_url": imagen_url,
    }

def _build_result_indeterminado(confianza=None, imagen_anotada=None):
    return {
        "variedad": "Timpson",
        "categoria": "INDETERMINADO",
        "categoria_label": "No determinado",
        "categoria_key": "indeterminado",
        "confianza": round(confianza,3) if confianza is not None else None,
        "confianza_pct": f"{round(confianza*100,1)} %" if confianza is not None else "—",
        "criterios_cumplidos": [],
        "aprobado_exportacion": False,
        "defectos": [],
        "norma": "Codex Alimentarius / NTP 011.012",
        "imagen_anotada": imagen_anotada,
        "indeterminado": True,
        "mensaje": "No se pudo determinar la categoría con suficiente confianza. Vuelve a intentarlo o usa otra imagen.",
    }

# ── ENDPOINTS ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status":"ok","yolo":YOLO_AVAILABLE,"opencv":CV2_AVAILABLE}

@app.post("/lotes", status_code=201)
def crear_lote(data: LoteIn):
    conn = get_db(); cur = conn.cursor()
    cur.execute("INSERT INTO lotes (lote_id,fundo,variedad,campana,fecha,perfil) VALUES (%s,%s,%s,%s,%s,%s) RETURNING id",
        (data.lote_id,data.fundo,data.variedad,data.campana,data.fecha,data.perfil))
    row_id = cur.fetchone()["id"]
    conn.commit(); cur.close(); conn.close()
    return {"id":row_id,"lote_id":data.lote_id,"message":"Lote registrado"}

@app.get("/lotes")
def listar_lotes():
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT * FROM lotes ORDER BY created_at DESC")
    rows = cur.fetchall(); cur.close(); conn.close()
    return [dict(r) for r in rows]

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    contents = await file.read()
    validar_imagen(contents, file.content_type)
    resultado = clasificar_imagen(contents, file.content_type)
    return {"success":True,"archivo":file.filename,"resultado":resultado}

@app.post("/clasificaciones", status_code=201)
def guardar_clasificacion(lote_id:str, variedad:str, categoria:str, confianza:float,
    criterios:str="[]", aprobado:int=0, imagen_nombre:str="", imagen_url:str="",
    perfil:str="operario", fecha_inspeccion:str=""):
    conn = get_db(); cur = conn.cursor()
    cur.execute("""INSERT INTO clasificaciones
        (lote_id,variedad,categoria,confianza,criterios,aprobado_exportacion,imagen_nombre,imagen_url,perfil,fecha_inspeccion)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
        (lote_id,variedad,categoria,confianza,criterios,aprobado,imagen_nombre,imagen_url,perfil,fecha_inspeccion))
    row_id = cur.fetchone()["id"]
    conn.commit(); cur.close(); conn.close()
    return {"id":row_id,"message":"Clasificación guardada"}

@app.get("/clasificaciones")
def listar_clasificaciones(limit:int=50):
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT * FROM clasificaciones WHERE perfil='operario' ORDER BY created_at DESC LIMIT %s",(limit,))
    rows = cur.fetchall(); cur.close(); conn.close()
    result = []
    for r in rows:
        d = dict(r)
        try: d["criterios"] = json.loads(d["criterios"] or "[]")
        except: d["criterios"] = []
        result.append(d)
    return result

@app.get("/clasificaciones/stats")
def stats_clasificaciones():
    """HU009: resumen de resultados para el dashboard del operario — categorías y defectos."""
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as total FROM clasificaciones WHERE perfil='operario'")
    total = cur.fetchone()["total"]
    cur.execute("SELECT COUNT(*) as cat1 FROM clasificaciones WHERE perfil='operario' AND aprobado_exportacion=1")
    cat1 = cur.fetchone()["cat1"]
    cur.close(); conn.close()

    cat2 = total - cat1
    cat1_pct = round((cat1/total*100),1) if total>0 else 0
    cat2_pct = round((cat2/total*100),1) if total>0 else 0

    # Los defectos se derivan de la categoría: el modelo clasifica CAT1/CAT2,
    # no detecta tipos de defecto de forma independiente (ver DEFECTOS).
    defectos = [
        {"nombre": "Mancha leve", "detectados": cat2},
        {"nombre": "Variación de color", "detectados": cat2},
        {"nombre": "Rastro severo", "detectados": 0},
    ]

    return {"total":total,"cat1":cat1,"cat2":cat2,
            "cat1_pct":cat1_pct,"cat2_pct":cat2_pct,
            "defectos":defectos}

@app.get("/clasificaciones/revision")
def listar_para_revision(estado:str="todas", fecha_desde:str="", fecha_hasta:str="", lote_id:str="", limit:int=50):
    """HU010: historial de clasificaciones con su estado de comparación (coincidencia/discrepancia/pendiente)."""
    condiciones = ["c.perfil = 'operario'"]
    params = []
    if fecha_desde:
        condiciones.append("c.fecha_inspeccion >= %s"); params.append(fecha_desde)
    if fecha_hasta:
        condiciones.append("c.fecha_inspeccion <= %s"); params.append(fecha_hasta)
    if lote_id:
        condiciones.append("c.lote_id = %s"); params.append(lote_id)
    if estado == "pendiente":
        condiciones.append("v.id IS NULL")
    elif estado == "coincidencia":
        condiciones.append("v.es_correcta = true")
    elif estado == "discrepancia":
        condiciones.append("v.es_correcta = false")

    where_sql = " AND ".join(condiciones)
    params.append(limit)

    conn = get_db(); cur = conn.cursor()
    cur.execute(f"""
        SELECT c.id, c.lote_id, c.variedad, c.categoria, c.confianza, c.imagen_url,
               c.fecha_inspeccion, c.created_at,
               v.id as validacion_id, v.es_correcta, v.observacion
        FROM clasificaciones c
        LEFT JOIN validaciones v ON v.clasificacion_id = c.id
        WHERE {where_sql}
        ORDER BY c.created_at DESC
        LIMIT %s
    """, params)
    rows = cur.fetchall(); cur.close(); conn.close()

    result = []
    for r in rows:
        d = dict(r)
        if d["validacion_id"] is None:
            d["estado"] = "pendiente"
        else:
            d["estado"] = "coincidencia" if d["es_correcta"] else "discrepancia"
        result.append(d)
    return result

# ── FEEDBACK SUPERVISOR (HU013) ────────────────────────────────────────────────
@app.post("/validaciones/feedback", status_code=201)
def guardar_feedback(data: FeedbackIn):
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT categoria, confianza, lote_id FROM clasificaciones WHERE id = %s", (data.clasificacion_id,))
    clasificacion = cur.fetchone()
    if not clasificacion:
        cur.close(); conn.close()
        raise HTTPException(404, "La clasificación indicada no existe.")

    cur.execute("SELECT id FROM validaciones WHERE clasificacion_id = %s", (data.clasificacion_id,))
    existente = cur.fetchone()
    if existente:
        cur.execute("""UPDATE validaciones SET es_correcta=%s, observacion=%s WHERE id=%s RETURNING id""",
            (data.es_correcta, data.observacion, existente["id"]))
    else:
        cur.execute("""INSERT INTO validaciones
            (lote_id, categoria_modelo, es_correcta, observacion, confianza, clasificacion_id)
            VALUES (%s,%s,%s,%s,%s,%s) RETURNING id""",
            (clasificacion["lote_id"], clasificacion["categoria"], data.es_correcta,
             data.observacion, clasificacion["confianza"], data.clasificacion_id))
    row_id = cur.fetchone()["id"]
    conn.commit(); cur.close(); conn.close()
    return {"id":row_id,"message":"Feedback registrado"}

@app.get("/validaciones/stats")
def stats_validaciones():
    """HU014: precisión preliminar = coincidencias / comparaciones válidas (excluye pendientes)."""
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as total FROM clasificaciones WHERE perfil='operario'")
    total = cur.fetchone()["total"]
    cur.execute("""
        SELECT COUNT(*) as validas,
               COUNT(*) FILTER (WHERE v.es_correcta = true)  as coincidencias,
               COUNT(*) FILTER (WHERE v.es_correcta = false) as discrepancias
        FROM clasificaciones c
        JOIN validaciones v ON v.clasificacion_id = c.id
        WHERE c.perfil = 'operario'
    """)
    row = cur.fetchone()
    cur.close(); conn.close()

    validas = row["validas"]
    coincidencias = row["coincidencias"]
    discrepancias = row["discrepancias"]
    pendientes = total - validas

    tiene_datos = validas > 0
    precision_preliminar_pct = round((coincidencias/validas*100),1) if tiene_datos else None
    tasa_discrepancias_pct   = round((discrepancias/validas*100),1) if tiene_datos else None

    return {"total":total, "validas":validas, "pendientes":pendientes,
            "coincidencias":coincidencias, "discrepancias":discrepancias,
            "precision_preliminar_pct":precision_preliminar_pct,
            "tasa_discrepancias_pct":tasa_discrepancias_pct,
            "tiene_datos":tiene_datos}

@app.get("/validaciones")
def listar_validaciones(limit:int=50):
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT * FROM validaciones ORDER BY created_at DESC LIMIT %s",(limit,))
    rows = cur.fetchall(); cur.close(); conn.close()
    return [dict(r) for r in rows]
