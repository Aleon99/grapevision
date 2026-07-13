from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import asyncio, sqlite3, io, json, random, os
from datetime import datetime

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    from ultralytics import YOLO
    MODEL_PATH = os.path.join(os.path.dirname(__file__), "best.pt")
    yolo_model = YOLO(MODEL_PATH)
    YOLO_AVAILABLE = True
    print(f"✅ Modelo YOLOv8 cargado: {MODEL_PATH}")
except Exception as e:
    YOLO_AVAILABLE = False
    print(f"⚠️  YOLOv8 no disponible: {e}")

app = FastAPI(title="GrapeVision API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.environ.get("DB_PATH", "grapevision.db")

# ── DB INIT ──────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS lotes (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            lote_id     TEXT NOT NULL,
            fundo       TEXT NOT NULL,
            variedad    TEXT NOT NULL,
            campana     TEXT NOT NULL,
            fecha       TEXT NOT NULL,
            perfil      TEXT DEFAULT 'operario',
            created_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS clasificaciones (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            lote_id             TEXT NOT NULL,
            variedad            TEXT,
            categoria           TEXT NOT NULL,
            confianza           REAL NOT NULL,
            criterios           TEXT,
            aprobado_exportacion INTEGER DEFAULT 0,
            imagen_nombre       TEXT,
            perfil              TEXT DEFAULT 'operario',
            created_at          TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS validaciones (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            lote_id             TEXT NOT NULL,
            categoria_modelo    TEXT NOT NULL,
            categoria_packing   TEXT NOT NULL,
            coincidencia        INTEGER DEFAULT 0,
            defectos            TEXT,
            created_at          TEXT DEFAULT (datetime('now'))
        );
    """)
    conn.commit()
    conn.close()

init_db()

# ── MODELOS PYDANTIC ──────────────────────────────────────────────────────────

class LoteIn(BaseModel):
    lote_id: str
    fundo: str
    variedad: str
    campana: str
    fecha: str
    perfil: Optional[str] = "operario"

class ValidacionIn(BaseModel):
    lote_id: str
    categoria_modelo: str
    categoria_packing: str
    defectos: Optional[list] = []

# ── LÓGICA DE CLASIFICACIÓN MOCK ─────────────────────────────────────────────

CRITERIOS = {
    "cat1": ["Color: Verde claro uniforme","Tamaño de baya: Grande","Compactación: Óptima","Pedicelo: Fresco"],
    "cat2": ["Ligeras manchas superficiales","Variación de color leve","Tamaño de baya: Medio","Pedicelo con leve deshidratación"],
}
DEFECTOS_MOCK = [
    {"nombre":"Mancha leve","estado":"Detectada","color":"#E53935"},
    {"nombre":"Variación de color","estado":"Detectada","color":"#F57C00"},
    {"nombre":"Raste severo","estado":"No detectado","color":"#2E7D4F"},
]

def clasificar_imagen(image_bytes: bytes) -> dict:
    # ── INFERENCIA REAL CON YOLOv8 ───────────────────────────
    if YOLO_AVAILABLE:
        try:
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            results = yolo_model.predict(img, conf=0.5, imgsz=640, verbose=False)
            boxes = results[0].boxes

            if len(boxes) == 0:
                # Sin detecciones → fallback mock
                seed = len(image_bytes) % 1000
                return _build_result(*_fallback(seed))

            # Tomar la detección con mayor confianza
            best_idx  = int(boxes.conf.argmax())
            clase_idx = int(boxes.cls[best_idx])
            confianza = float(boxes.conf[best_idx])
            clase_nombre = yolo_model.names[clase_idx]  # "CAT 1" o "CAT 2"

            categoria   = "cat1" if clase_idx == 0 else "cat2"
            variedad    = "Red Globe"   # ajustar si tienes variedad en el modelo
            return _build_result(variedad, categoria, confianza)

        except Exception as e:
            print(f"Error en inferencia YOLO: {e}")

    # ── FALLBACK MOCK si YOLO no está disponible ──────────────
    seed = len(image_bytes) % 1000
    if PIL_AVAILABLE:
        try:
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img_small = img.resize((32, 32))
            pixels = list(img_small.getdata())
            r = sum(p[0] for p in pixels) / len(pixels)
            g = sum(p[1] for p in pixels) / len(pixels)
            variedad = "Red Globe" if r > g else "Sweet Globe"
            sat = abs(r - g)
            categoria = "cat1" if sat > 25 else "cat2"
            rng = random.Random(seed)
            confianza = 0.918 if categoria == "cat1" else round(0.78 + rng.uniform(-0.04, 0.06), 3)
            return _build_result(variedad, categoria, confianza)
        except Exception:
            pass

    return _build_result(*_fallback(seed))


def _build_result(variedad: str, categoria: str, confianza: float) -> dict:
    return {
        "variedad": variedad,
        "categoria": f"CAT {'1' if categoria == 'cat1' else '2'}",
        "categoria_label": f"Categoría {'1' if categoria == 'cat1' else '2'}",
        "categoria_key": categoria,
        "confianza": confianza,
        "confianza_pct": f"{round(confianza * 100, 1)} %",
        "criterios_cumplidos": CRITERIOS[categoria],
        "aprobado_exportacion": categoria == "cat1",
        "defectos": DEFECTOS_MOCK,
        "norma": "Codex Alimentarius / NTP 011.012",
    }

def _fallback(seed):
    rng = random.Random(seed)
    variedad = rng.choice(["Red Globe", "Sweet Globe"])
    categoria = rng.choice(["cat1", "cat1", "cat2"])
    confianza = 0.918 if categoria == "cat1" else round(rng.uniform(0.78, 0.87), 3)
    return variedad, categoria, confianza

# ── ENDPOINTS ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0", "db": DB_PATH}

# Lotes
@app.post("/lotes", status_code=201)
def crear_lote(data: LoteIn):
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO lotes (lote_id,fundo,variedad,campana,fecha,perfil) VALUES (?,?,?,?,?,?)",
        (data.lote_id, data.fundo, data.variedad, data.campana, data.fecha, data.perfil)
    )
    conn.commit()
    row_id = cur.lastrowid
    conn.close()
    return {"id": row_id, "lote_id": data.lote_id, "message": "Lote registrado"}

@app.get("/lotes")
def listar_lotes():
    conn = get_db()
    rows = conn.execute("SELECT * FROM lotes ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

# Clasificaciones
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    contents = await file.read()
    await asyncio.sleep(1.2)
    resultado = clasificar_imagen(contents)
    return {"success": True, "archivo": file.filename, "resultado": resultado}

@app.post("/clasificaciones", status_code=201)
def guardar_clasificacion(
    lote_id: str,
    variedad: str,
    categoria: str,
    confianza: float,
    criterios: str = "[]",
    aprobado: int = 0,
    imagen_nombre: str = "",
    perfil: str = "operario",
):
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO clasificaciones (lote_id,variedad,categoria,confianza,criterios,aprobado_exportacion,imagen_nombre,perfil) VALUES (?,?,?,?,?,?,?,?)",
        (lote_id, variedad, categoria, confianza, criterios, aprobado, imagen_nombre, perfil)
    )
    conn.commit()
    row_id = cur.lastrowid
    conn.close()
    return {"id": row_id, "message": "Clasificación guardada"}

@app.get("/clasificaciones")
def listar_clasificaciones(limit: int = 50):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM clasificaciones ORDER BY created_at DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        try:
            d["criterios"] = json.loads(d["criterios"] or "[]")
        except Exception:
            d["criterios"] = []
        result.append(d)
    return result

# Validaciones (Supervisor)
@app.post("/validaciones", status_code=201)
def guardar_validacion(data: ValidacionIn):
    coincidencia = 1 if data.categoria_modelo == data.categoria_packing else 0
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO validaciones (lote_id,categoria_modelo,categoria_packing,coincidencia,defectos) VALUES (?,?,?,?,?)",
        (data.lote_id, data.categoria_modelo, data.categoria_packing, coincidencia, json.dumps(data.defectos))
    )
    conn.commit()
    row_id = cur.lastrowid
    conn.close()
    return {"id": row_id, "coincidencia": bool(coincidencia), "message": "Validación registrada"}

@app.get("/validaciones/stats")
def stats_validaciones():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) as n FROM validaciones").fetchone()["n"]
    coincidencias = conn.execute("SELECT COUNT(*) as n FROM validaciones WHERE coincidencia=1").fetchone()["n"]
    discrepancias = total - coincidencias
    precision = round((coincidencias / total * 100), 1) if total > 0 else 0
    conn.close()
    return {
        "total": total,
        "coincidencias": coincidencias,
        "discrepancias": discrepancias,
        "precision_pct": precision,
    }
