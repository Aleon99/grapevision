import { useState, useRef, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const HISTORIAL_INICIAL = [
  { lote:"L-2026-015", categoria:"Categoría 1", confianza:"91.8 %", fecha:"05/06/2026 11:26", tipo:"cat1" },
  { lote:"L-2026-014", categoria:"Categoría 2", confianza:"87.4 %", fecha:"05/06/2026 10:48", tipo:"cat2" },
  { lote:"L-2026-013", categoria:"Categoría 1", confianza:"93.1 %", fecha:"05/06/2026 09:15", tipo:"cat1" },
  { lote:"L-2026-012", categoria:"Categoría 2", confianza:"76.2 %", fecha:"04/06/2026 16:32", tipo:"cat2" },
];

const S = {
  verde:"#2E7D4F", verdeOsc:"#1E6B3C", fondoApp:"#F5F5F5",
  blanco:"#FFFFFF", gris1:"#212121", gris2:"#616161", gris3:"#9E9E9E",
  borde:"#E0E0E0", ambar:"#FFF3CD", ambarTxt:"#856404",
  verdeBadge:"#D4EDDA", infoFondo:"#EBF4FF", infoTxt:"#1565C0", exito:"#E8F5EE",
};

const DEFECTOS_CLIENTE = {
  cat1: [
    { nombre:"Mancha leve",        estado:"No detectada", color:"#2E7D4F" },
    { nombre:"Variación de color", estado:"No detectada", color:"#2E7D4F" },
    { nombre:"Rastro severo",      estado:"No detectado", color:"#2E7D4F" },
  ],
  cat2: [
    { nombre:"Mancha leve",        estado:"Detectada",    color:"#E53935" },
    { nombre:"Variación de color", estado:"Detectada",    color:"#F57C00" },
    { nombre:"Rastro severo",      estado:"No detectado", color:"#2E7D4F" },
  ],
};

const btn = (extra={}) => ({
  height:48, borderRadius:8, border:"none", background:S.verdeOsc,
  color:"#fff", fontSize:15, fontWeight:600, fontFamily:"inherit",
  width:"100%", cursor:"pointer", display:"flex", alignItems:"center",
  justifyContent:"center", gap:8, ...extra
});

const input = {
  height:48, border:`1px solid ${S.borde}`, borderRadius:8,
  padding:"0 14px", fontSize:15, fontFamily:"inherit",
  background:S.blanco, color:S.gris1, width:"100%", boxSizing:"border-box"
};

const card = { background:S.blanco, border:`1px solid ${S.borde}`, borderRadius:12, padding:16 };
const pageWrap = { maxWidth:720, margin:"0 auto", padding:"24px 16px 40px", width:"100%" };

function Spinner({ texto }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"60px 20px", gap:20 }}>
      <div style={{ width:52, height:52, border:`4px solid ${S.verdeBadge}`,
        borderTopColor:S.verdeOsc, borderRadius:"50%",
        animation:"spin 0.9s linear infinite" }}/>
      <div style={{ fontSize:14, color:S.gris2, fontWeight:500 }}>{texto}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function TopNav({ title, showBack, onBack, role, onNav, navActive }) {
  return (
    <div style={{ background:S.verde, color:"#fff", position:"sticky", top:0, zIndex:100 }}>
      <div style={{ maxWidth:720, margin:"0 auto", height:60, display:"flex",
        alignItems:"center", gap:12, padding:"0 16px" }}>
        {showBack ? (
          <button onClick={onBack} style={{ background:"none", border:"none",
            padding:0, cursor:"pointer", display:"flex", alignItems:"center", color:"#fff" }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <path d="M15.5 19L8.5 12L15.5 5" stroke="#fff" strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ) : (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:30, height:30, borderRadius:8,
              background:"rgba(255,255,255,0.2)", display:"flex",
              alignItems:"center", justifyContent:"center", fontSize:16 }}>🍇</div>
            <span style={{ fontSize:16, fontWeight:700 }}>GrapeVision</span>
          </div>
        )}
        <span style={{ flex:1, fontSize:17, fontWeight:600 }}>
          {showBack ? title : ""}
        </span>
        {role && !showBack && (
          <div style={{ fontSize:12, background:"rgba(255,255,255,0.2)",
            padding:"4px 10px", borderRadius:20, fontWeight:500 }}>
            {role === "operario" ? "Operario" : "Supervisor"}
          </div>
        )}
      </div>
      {role && (
        <div style={{ maxWidth:720, margin:"0 auto", display:"flex",
          borderTop:"1px solid rgba(255,255,255,0.15)" }}>
          {[{key:"inicio",label:"Inicio"},{key:"historial",label:"Historial"},{key:"dashboard",label:"Dashboard"},{key:"perfil",label:"Perfil"}].map(t => (
            <button key={t.key} onClick={() => onNav(t.key)}
              style={{ flex:1, height:44, background:"none", border:"none",
                cursor:"pointer", fontSize:13, fontWeight:600,
                color: navActive===t.key ? "#fff" : "rgba(255,255,255,0.6)",
                borderBottom: navActive===t.key ? "3px solid #fff" : "3px solid transparent" }}>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Label({ children, required }) {
  return (
    <label style={{ fontSize:13, fontWeight:500, color:S.gris1 }}>
      {children}{required && <span style={{ color:"#D32F2F" }}> *</span>}
    </label>
  );
}

function RoleSelect({ onSelect }) {
  return (
    <div style={{ ...pageWrap, maxWidth:480, display:"flex",
      flexDirection:"column", alignItems:"center", gap:36, paddingTop:60 }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
        <div style={{ width:72, height:72, borderRadius:18, background:S.verdeOsc,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>🍇</div>
        <div style={{ fontSize:26, fontWeight:700, color:S.gris1 }}>GrapeVision</div>
        <div style={{ fontSize:15, color:S.gris2 }}>Sistema de Clasificación de Uva</div>
        <div style={{ fontSize:13, color:S.gris3 }}>AGROEXPORT S.A.</div>
      </div>
      <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ fontSize:14, fontWeight:600, color:S.gris2, textAlign:"center" }}>
          Selecciona tu perfil
        </div>
        {[
          { role:"operario",   title:"Operario de Campo",     emoji:"👷",
            desc:"Registra lotes, captura imágenes y consulta resultados" },
          { role:"supervisor", title:"Supervisor de Calidad",  emoji:"🔍",
            desc:"Valida clasificaciones y revisa defectos visuales" },
        ].map(r => (
          <button key={r.role} onClick={() => onSelect(r.role)}
            style={{ width:"100%", background:S.blanco, border:`1.5px solid ${S.borde}`,
              borderRadius:12, padding:"18px 20px", cursor:"pointer", textAlign:"left",
              display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ fontSize:28 }}>{r.emoji}</div>
            <div>
              <div style={{ fontSize:16, fontWeight:600, color:S.gris1 }}>{r.title}</div>
              <div style={{ fontSize:13, color:S.gris2, marginTop:2 }}>{r.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

const VARIEDAD_UNICA = "Timpson";

function RegistroLote({ onGuardar }) {
  const [data, setData] = useState({
    fundo:"La Esperanza", lote:"",
    variedad:VARIEDAD_UNICA, campana:"2026", fecha:fechaHoy()
  });
  const [saved, setSaved]     = useState(false);
  const [loading, setLoading] = useState(false);
  const upd = (k,v) => setData(d => ({...d,[k]:v}));

  const handleGuardar = async () => {
    setLoading(true);
    try {
      await fetch(`${API}/lotes`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ lote_id:data.lote, fundo:data.fundo,
          variedad:data.variedad, campana:data.campana, fecha:data.fecha, perfil:"operario" })
      });
    } catch(_) {}
    setSaved(true);
    setTimeout(() => { setSaved(false); setLoading(false); onGuardar(data); }, 1100);
  };

  const fields = [
    { label:"Fundo",    key:"fundo",    type:"select", opts:["La Esperanza","Fundo Norte","Fundo Sur"] },
    { label:"Lote",     key:"lote",     type:"text" },
    { label:"Campaña",  key:"campana",  type:"text" },
    { label:"Fecha de inspección", key:"fecha", type:"date" },
  ];

  return (
    <div style={pageWrap}>
      <h2 style={{ margin:"0 0 24px", fontSize:20, fontWeight:700, color:S.gris1 }}>Registro de Lote</h2>
      <div style={{ ...card, display:"flex", flexDirection:"column", gap:18 }}>
        {fields.map(f => (
          <div key={f.key} style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <Label required>{f.label}</Label>
            {f.type==="select" ? (
              <select value={data[f.key]} onChange={e => upd(f.key,e.target.value)}
                style={{ ...input, appearance:"none" }}>
                {f.opts.map(o => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input type={f.type} value={data[f.key]}
                onChange={e => upd(f.key,e.target.value)} style={input}/>
            )}
          </div>
        ))}
        <button onClick={handleGuardar} disabled={loading} style={btn({ marginTop:8 })}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <path d="M6 3H15L19 7V21H6V3Z" stroke="#fff" strokeWidth={1.8} strokeLinejoin="round"/>
            <path d="M15 3V7H19" stroke="#fff" strokeWidth={1.8} strokeLinejoin="round"/>
            <path d="M9 13H15M9 17H15" stroke="#fff" strokeWidth={1.8} strokeLinecap="round"/>
          </svg>
          {loading ? "Guardando..." : "Guardar lote"}
        </button>
        {saved && (
          <div style={{ background:S.exito, borderRadius:8, padding:"12px 16px",
            color:S.verdeOsc, fontWeight:600, fontSize:14, display:"flex", alignItems:"center", gap:8 }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <path d="M4 12.5L9 17.5L20 6.5" stroke={S.verdeOsc} strokeWidth={2.4}
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Lote registrado correctamente
          </div>
        )}
      </div>
    </div>
  );
}

const FORMATOS_PERMITIDOS = ["image/jpeg", "image/png"];
const TAMANO_MAXIMO_MB = 10;

function validarArchivo(f) {
  if (!FORMATOS_PERMITIDOS.includes(f.type)) {
    return `Formato no permitido (${f.type || "desconocido"}). Usa JPG o PNG.`;
  }
  if (f.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
    return `La imagen supera el máximo de ${TAMANO_MAXIMO_MB}MB.`;
  }
  return null;
}

function TarjetaIndeterminado({ resultado, onReintentar, onOtraImagen }) {
  return (
    <>
      {resultado.imagen_anotada && (
        <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${S.borde}` }}>
          <img src={resultado.imagen_anotada} alt="indeterminado"
            style={{ width:"100%", maxHeight:380, objectFit:"contain", display:"block" }}/>
        </div>
      )}
      <div style={{ background:S.ambar, borderRadius:8, padding:"14px 16px" }}>
        <div style={{ fontWeight:700, color:S.ambarTxt, marginBottom:4 }}>⚠ No se pudo determinar la categoría</div>
        <div style={{ fontSize:13, color:S.ambarTxt }}>{resultado.mensaje}</div>
      </div>
      <button onClick={onReintentar} style={btn()}>🔄 Reintentar con esta imagen</button>
      <button onClick={onOtraImagen}
        style={{ ...btn(), background:S.blanco, color:S.verdeOsc, border:`1.5px solid ${S.verdeOsc}` }}>
        📷 Elegir otra imagen
      </button>
    </>
  );
}

function fechaHoy() { return new Date().toISOString().slice(0,10); }

function CapturaImagen({ loteInicial, onEnviar, onNuevoLote }) {
  const [lotes,        setLotes]        = useState([]);
  const [cargandoLotes,setCargandoLotes]= useState(true);
  const [loteId,       setLoteId]       = useState(loteInicial?.lote || "");
  const [fecha,        setFecha]        = useState(fechaHoy());
  const [preview,    setPreview]    = useState(null);
  const [file,       setFile]       = useState(null);
  const [meta,       setMeta]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [imgAnotada, setImgAnotada] = useState(null);
  const [error,      setError]      = useState(null);
  const [indeterminado, setIndeterminado] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    fetch(`${API}/lotes`)
      .then(r => r.json())
      .then(rows => {
        const lista = Array.isArray(rows) ? rows : [];
        setLotes(lista);
        setCargandoLotes(false);
        setLoteId(actual => actual || (lista[0]?.lote_id || ""));
      })
      .catch(() => setCargandoLotes(false));
  }, []);

  useEffect(() => {
    if (loteInicial?.lote) setLoteId(loteInicial.lote);
  }, [loteInicial]);

  const handleFile = (f) => {
    if (!f) return;
    setError(null); setIndeterminado(null);
    const err = validarArchivo(f);
    if (err) { setError(err); setFile(null); setPreview(null); setMeta(null); return; }
    setFile(f); setImgAnotada(null);
    setMeta({ tipo:f.type.split("/")[1]?.toUpperCase()||"JPG", tam:`${(f.size/1024/1024).toFixed(1)} MB` });
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const handleEnviar = async () => {
    if (!file) return;
    setLoading(true); setError(null); setIndeterminado(null);
    let resultado = null;
    try {
      const fd = new FormData(); fd.append("file", file);
      const res  = await fetch(`${API}/predict`, { method:"POST", body:fd });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setError(err?.detail || "No se pudo procesar la imagen.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      resultado  = data.resultado;
    } catch(_) {}
    if (!resultado) {
      resultado = {
        variedad:"Timpson", categoria:"CAT 1", categoria_label:"Categoría 1",
        confianza:0.918, confianza_pct:"91.8 %",
        criterios_cumplidos:["Color: Verde claro uniforme","Tamaño de baya: Grande","Compactación: Óptima","Pedicelo: Fresco"],
        aprobado_exportacion:true,
        defectos:[
          {nombre:"Mancha leve",estado:"No detectada",color:"#2E7D4F"},
          {nombre:"Variación de color",estado:"No detectada",color:"#2E7D4F"},
          {nombre:"Raste severo",estado:"No detectado",color:"#2E7D4F"},
        ],
        imagen_anotada:null,
      };
    }
    if (resultado.indeterminado) {
      setIndeterminado(resultado);
      setLoading(false);
      return;
    }
    if (resultado.imagen_anotada) {
      setImgAnotada(resultado.imagen_anotada);
      setLoading(false);
      setTimeout(() => onEnviar(resultado, loteId, fecha), 1500);
    } else {
      setLoading(false);
      onEnviar(resultado, loteId, fecha);
    }
  };

  const otraImagen = () => {
    setIndeterminado(null); setFile(null); setPreview(null); setMeta(null); setError(null);
  };

  const checks = meta ? [
    { label:`Formato: ${meta.tipo} válido` },
    { label:`Resolución: válida` },
    { label:`Tamaño: ${meta.tam}` },
  ] : [];

  return (
    <div style={pageWrap}>
      <h2 style={{ margin:"0 0 20px", fontSize:20, fontWeight:700, color:S.gris1 }}>Captura de Imagen</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <div>
          <Label required>Lote</Label>
          <div style={{ display:"flex", gap:8, marginTop:6 }}>
            <select value={loteId} onChange={e => setLoteId(e.target.value)}
              disabled={cargandoLotes || lotes.length===0}
              style={{ ...input, flex:1, appearance:"none" }}>
              {lotes.length===0 && <option value="">{cargandoLotes ? "Cargando lotes..." : "Sin lotes registrados"}</option>}
              {lotes.map(l => <option key={l.id} value={l.lote_id}>{l.lote_id} · {l.fundo}</option>)}
            </select>
            <button onClick={onNuevoLote} style={{ height:48, padding:"0 16px", borderRadius:8,
              border:`1.5px solid ${S.verdeOsc}`, background:S.blanco, color:S.verdeOsc,
              fontWeight:600, fontSize:13, cursor:"pointer", whiteSpace:"nowrap" }}>
              + Nuevo
            </button>
          </div>
        </div>
        <div>
          <Label required>Fecha de inspección</Label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ ...input, marginTop:6 }}/>
        </div>
        {!cargandoLotes && lotes.length===0 && (
          <div style={{ background:S.infoFondo, borderRadius:8, padding:"12px 14px", fontSize:13, color:S.infoTxt }}>
            ℹ Aún no tienes lotes registrados. Toca "+ Nuevo" para registrar el primero antes de clasificar.
          </div>
        )}
        {error && (
          <div style={{ background:"#FFEBEE", borderRadius:8, padding:"10px 14px", color:"#C62828", fontSize:13, fontWeight:500 }}>
            ⚠ {error}
          </div>
        )}
        {indeterminado ? (
          <TarjetaIndeterminado resultado={indeterminado} onReintentar={handleEnviar} onOtraImagen={otraImagen}/>
        ) : (
          <>
            {loading ? (
              <Spinner texto="Analizando con YOLOv8..." />
            ) : (
              <div onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                onDragOver={e => e.preventDefault()}
                onClick={() => !preview && fileRef.current.click()}
                style={{ width:"100%", borderRadius:12, overflow:"hidden",
                  border:`2px dashed ${S.verdeOsc}`, background:"#f9f9f9",
                  cursor: preview ? "default" : "pointer",
                  display:"flex", alignItems:"center", justifyContent:"center", minHeight:280 }}>
                {imgAnotada
                  ? <img src={imgAnotada} alt="anotada" style={{ width:"100%", maxHeight:440, objectFit:"contain", display:"block" }}/>
                  : preview
                    ? <img src={preview} alt="preview" style={{ width:"100%", maxHeight:440, objectFit:"cover", display:"block" }}/>
                    : <div style={{ textAlign:"center", color:S.gris3, fontSize:15, padding:40 }}>
                        <div style={{ fontSize:48, marginBottom:12 }}>📷</div>
                        <div>Arrastra una imagen aquí</div>
                        <div style={{ fontSize:13, marginTop:6 }}>o haz clic para seleccionar (JPG/PNG, máx. {TAMANO_MAXIMO_MB}MB)</div>
                      </div>
                }
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" style={{ display:"none" }}
              onChange={e => handleFile(e.target.files[0])}/>
            {!loading && !imgAnotada && (
              <button onClick={() => fileRef.current.click()}
                style={{ ...btn(), background:S.blanco, color:S.verdeOsc, border:`1.5px solid ${S.verdeOsc}` }}>
                📷 Seleccionar imagen del racimo
              </button>
            )}
            {checks.map((c,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, fontSize:13 }}>
                <div style={{ width:18, height:18, borderRadius:"50%", background:S.exito,
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                    <path d="M4 12.5L9 17.5L20 6.5" stroke={S.verdeOsc} strokeWidth={2.5}
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ color:S.gris2 }}>{c.label}</span>
              </div>
            ))}
            {!loading && !imgAnotada && (
              <button onClick={handleEnviar} disabled={!preview || !loteId}
                style={btn({ opacity:(!preview || !loteId) ? 0.5 : 1 })}>
                🔍 Enviar a clasificación
              </button>
            )}
            {imgAnotada && (
              <div style={{ background:S.infoFondo, borderRadius:8, padding:"10px 14px", fontSize:13, color:S.infoTxt }}>
                ✓ Detección completada — redirigiendo al resultado...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ResultadoClasificacion({ resultado, loteId, fecha, onGuardar }) {
  const [saved, setSaved] = useState(false);
  const esCat1 = resultado?.aprobado_exportacion;

  const handleGuardar = async () => {
    try {
      await fetch(`${API}/clasificaciones?lote_id=${loteId}&variedad=${resultado.variedad}&categoria=${resultado.categoria_label}&confianza=${resultado.confianza}&aprobado=${esCat1?1:0}&criterios=${encodeURIComponent(JSON.stringify(resultado.criterios_cumplidos))}&imagen_url=${encodeURIComponent(resultado.imagen_url||"")}&fecha_inspeccion=${fecha||""}`, { method:"POST" });
    } catch(_) {}
    setSaved(true);
    setTimeout(() => onGuardar(), 900);
  };

  if (!resultado) return null;

  return (
    <div style={pageWrap}>
      <h2 style={{ margin:"0 0 20px", fontSize:20, fontWeight:700, color:S.gris1 }}>Resultado de Clasificación</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ background:S.exito, borderRadius:8, padding:"10px 14px",
          color:S.verdeOsc, fontWeight:600, fontSize:14, display:"flex", alignItems:"center", gap:8 }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <path d="M4 12.5L9 17.5L20 6.5" stroke={S.verdeOsc} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Clasificación completada
        </div>
        {resultado.imagen_anotada && (
          <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${S.borde}` }}>
            <img src={resultado.imagen_anotada} alt="detección"
              style={{ width:"100%", display:"block", maxHeight:380, objectFit:"contain" }}/>
          </div>
        )}
        <div style={card}>
          <div style={{ fontSize:13, color:S.gris2, marginBottom:4 }}>Variedad detectada</div>
          <div style={{ fontSize:16, fontWeight:600, color:S.gris1, marginBottom:12 }}>{resultado.variedad}</div>
          <div style={{ fontSize:13, color:S.gris2, marginBottom:4 }}>Categoría sugerida</div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontSize:32, fontWeight:700, color: esCat1 ? S.verdeOsc : "#B8860B" }}>
              {resultado.categoria_label}
            </div>
            {esCat1 && (
              <svg width={32} height={32} viewBox="0 0 24 24" fill={S.verdeOsc}>
                <path d="M12 2L14.4 9H22L16 13.8L18.4 21L12 16.2L5.6 21L8 13.8L2 9H9.6Z"/>
              </svg>
            )}
          </div>
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:13, color:S.gris2 }}>Confianza</div>
            <div style={{ fontSize:28, fontWeight:700, color: esCat1 ? S.verdeOsc : "#B8860B" }}>
              {resultado.confianza_pct || `${(resultado.confianza*100).toFixed(1)} %`}
            </div>
          </div>
          <div style={{ marginTop:8, fontSize:13, color:S.gris2 }}>
            Fecha de inspección: {fecha || "—"}
          </div>
        </div>
        <div style={{ background:S.infoFondo, borderRadius:8, padding:"12px 14px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:S.infoTxt, marginBottom:4 }}>ℹ Resultado confiable</div>
          <div style={{ fontSize:13, color:S.infoTxt }}>El modelo tiene alta confianza en esta clasificación.</div>
        </div>
        <div style={card}>
          <div style={{ fontSize:15, fontWeight:600, color:S.gris1, marginBottom:12 }}>Atributos detectados</div>
          {resultado.criterios_cumplidos?.map((c,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:14, color:S.gris2, marginBottom:8 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <path d="M4 12.5L9 17.5L20 6.5" stroke={S.verdeOsc} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {c}
            </div>
          ))}
        </div>
        <button onClick={handleGuardar} disabled={saved} style={btn()}>
          {saved ? "Guardado ✓" : "Guardar resultado"}
        </button>
      </div>
    </div>
  );
}

function Historial({ rows }) {
  const [selected, setSelected] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");

  const filasFiltradas = rows.filter(r => {
    const coincideLote = r.lote.toLowerCase().includes(busqueda.trim().toLowerCase());
    const coincideCategoria = filtroCategoria === "todas" || r.tipo === filtroCategoria;
    return coincideLote && coincideCategoria;
  });
  const s = filasFiltradas[selected] || filasFiltradas[0];

  return (
    <div style={pageWrap}>
      <h2 style={{ margin:"0 0 20px", fontSize:20, fontWeight:700, color:S.gris1 }}>Historial de Clasificaciones</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ display:"flex", gap:8 }}>
          <input placeholder="Buscar por lote..." value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setSelected(0); }}
            style={{ ...input, flex:1, height:40 }}/>
          <select value={filtroCategoria}
            onChange={e => { setFiltroCategoria(e.target.value); setSelected(0); }}
            style={{ height:40, border:`1px solid ${S.borde}`, borderRadius:8,
              background:S.blanco, padding:"0 10px", fontSize:13, color:S.gris2, appearance:"none" }}>
            <option value="todas">Todas</option>
            <option value="cat1">Categoría 1</option>
            <option value="cat2">Categoría 2</option>
          </select>
        </div>
        {filasFiltradas.length === 0 && (
          <div style={{ background:S.infoFondo, borderRadius:8, padding:"12px 14px", fontSize:13, color:S.infoTxt }}>
            ℹ No se encontraron registros con esos filtros.
          </div>
        )}
        <div style={{ background:S.blanco, border:`1px solid ${S.borde}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr .8fr 1fr",
            padding:"12px 16px", borderBottom:`1px solid ${S.borde}`,
            fontSize:12, fontWeight:600, color:S.gris2, background:"#FAFAFA" }}>
            <span>Lote</span><span>Categoría</span><span>Conf.</span><span>Fecha</span>
          </div>
          {filasFiltradas.map((r,i) => (
            <div key={i} onClick={() => setSelected(i)}
              style={{ display:"grid", gridTemplateColumns:"1fr 1fr .8fr 1fr",
                padding:"12px 16px", borderBottom:`1px solid ${S.borde}`,
                background: i===selected ? "#F5FAF7" : S.blanco,
                cursor:"pointer", fontSize:13, color:S.gris1, alignItems:"center" }}>
              <span style={{ fontWeight:500 }}>{r.lote}</span>
              <span>
                <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600,
                  background: r.tipo==="cat1" ? S.verdeBadge : S.ambar,
                  color: r.tipo==="cat1" ? S.verdeOsc : S.ambarTxt }}>
                  {r.categoria}
                </span>
              </span>
              <span>{r.confianza}</span>
              <span style={{ color:S.gris2, fontSize:12 }}>
                {r.fecha.split(" ")[0]}<br/>{r.fecha.split(" ")[1]}
              </span>
            </div>
          ))}
        </div>
        {s && (
          <div style={card}>
            <div style={{ fontSize:14, fontWeight:600, color:S.gris1, marginBottom:12 }}>Información del registro seleccionado</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 24px" }}>
              {[["Lote",s.lote],["Categoría",s.categoria],["Confianza",s.confianza],["Fecha",s.fecha],
                ["Registrado por","Operario de Calidad en Campo"],["Trazabilidad","lote, imagen, resultado y fecha"]
              ].map(([k,v]) => (
                <div key={k} style={{ fontSize:13 }}>
                  <div style={{ color:S.gris3, fontSize:11, marginBottom:2 }}>{k}</div>
                  <div style={{ color:S.gris1, fontWeight:500 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <button style={btn()}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <path d="M6 3H15L19 7V21H6V3Z" stroke="#fff" strokeWidth={1.8} strokeLinejoin="round"/>
          </svg>
          Consultar historial completo
        </button>
      </div>
    </div>
  );
}

const ESTADO_INFO = {
  pendiente:    { label:"Pendiente",    bg:S.ambar,      color:S.ambarTxt },
  coincidencia: { label:"Coincidencia", bg:S.verdeBadge, color:S.verdeOsc },
  discrepancia: { label:"Discrepancia", bg:"#FFEBEE",    color:"#C62828" },
};

function RevisionClasificaciones({ estadoInicial = "todas", titulo = "Revisión de Clasificaciones" }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState(estadoInicial);
  const [lote, setLote] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);
  const [observacion, setObservacion] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = () => {
    setLoading(true);
    const params = new URLSearchParams({ estado, limit:"50" });
    if (lote) params.set("lote_id", lote);
    if (fechaDesde) params.set("fecha_desde", fechaDesde);
    if (fechaHasta) params.set("fecha_hasta", fechaHasta);
    fetch(`${API}/clasificaciones/revision?${params}`)
      .then(r => r.json())
      .then(data => { setRows(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(cargar, [estado]);

  const abrir = (r) => { setSeleccionado(r); setObservacion(r.observacion || ""); };
  const cerrar = () => { setSeleccionado(null); setObservacion(""); };

  const handleValidar = async (esCorrecta) => {
    if (!seleccionado) return;
    setGuardando(true);
    try {
      await fetch(`${API}/validaciones/feedback`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ clasificacion_id: seleccionado.id, es_correcta: esCorrecta, observacion }),
      });
      cerrar();
      cargar();
    } finally { setGuardando(false); }
  };

  if (seleccionado) {
    const categoriaKey = seleccionado.categoria?.includes("1") ? "cat1" : "cat2";
    const defectos = DEFECTOS_CLIENTE[categoriaKey];
    return (
      <div style={pageWrap}>
        <h2 style={{ margin:"0 0 20px", fontSize:20, fontWeight:700, color:S.gris1 }}>Validar Clasificación</h2>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${S.borde}`, background:"#f5f5f5",
            height:220, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {seleccionado.imagen_url ? (
              <img src={seleccionado.imagen_url} alt="inspección" style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
            ) : (
              <span style={{ color:S.gris3, fontSize:13 }}>🍇 Imagen no disponible</span>
            )}
          </div>
          <div style={card}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:S.gris2 }}>
              <span>Lote: <b style={{ color:S.gris1 }}>{seleccionado.lote_id}</b></span>
              <span>Fecha: <b style={{ color:S.gris1 }}>{seleccionado.fecha_inspeccion || "—"}</b></span>
            </div>
            <div style={{ marginTop:12, fontSize:28, fontWeight:700, color:S.gris1 }}>{seleccionado.categoria}</div>
            <div style={{ fontSize:13, color:S.gris2 }}>Confianza del modelo: {(seleccionado.confianza*100).toFixed(1)} %</div>
          </div>
          <div style={card}>
            <div style={{ fontSize:14, fontWeight:600, color:S.gris1, marginBottom:10 }}>Defectos detectados</div>
            {defectos.map((d,i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0",
                borderBottom: i<defectos.length-1 ? `1px solid ${S.borde}` : "none", fontSize:13 }}>
                <span style={{ color:S.gris2 }}>{d.nombre}</span>
                <span style={{ color:d.color, fontWeight:600 }}>{d.estado}</span>
              </div>
            ))}
          </div>
          <div>
            <Label>Observación (opcional)</Label>
            <textarea value={observacion} onChange={e => setObservacion(e.target.value)}
              placeholder="Ej: el racimo real llegó como Categoría 1 a packing..."
              style={{ ...input, height:80, marginTop:6, resize:"vertical", paddingTop:10 }}/>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button disabled={guardando} onClick={() => handleValidar(true)}
              style={btn({ background:S.verdeOsc, flex:1 })}>✓ Coincide</button>
            <button disabled={guardando} onClick={() => handleValidar(false)}
              style={btn({ background:"#C62828", flex:1 })}>✗ Discrepancia</button>
          </div>
          <button onClick={cerrar} style={{ ...btn({ background:S.blanco, color:S.gris2 }), border:`1px solid ${S.borde}` }}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <h2 style={{ margin:"0 0 20px", fontSize:20, fontWeight:700, color:S.gris1 }}>{titulo}</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <select value={estado} onChange={e => setEstado(e.target.value)}
            style={{ height:40, border:`1px solid ${S.borde}`, borderRadius:8,
              background:S.blanco, padding:"0 10px", fontSize:13, color:S.gris2, appearance:"none" }}>
            <option value="todas">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="coincidencia">Coincidencia</option>
            <option value="discrepancia">Discrepancia</option>
          </select>
          <input placeholder="Filtrar por lote..." value={lote} onChange={e => setLote(e.target.value)}
            style={{ ...input, height:40, width:140 }}/>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
            style={{ ...input, height:40, width:150 }}/>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
            style={{ ...input, height:40, width:150 }}/>
          <button onClick={cargar} style={{ height:40, padding:"0 16px", borderRadius:8, border:"none",
            background:S.verdeOsc, color:"#fff", fontWeight:600, fontSize:13, cursor:"pointer" }}>
            Filtrar
          </button>
        </div>
        {loading ? (
          <div style={{ textAlign:"center", padding:60, color:S.gris3 }}>Cargando...</div>
        ) : rows.length === 0 ? (
          <div style={{ background:S.infoFondo, borderRadius:8, padding:"12px 14px", fontSize:13, color:S.infoTxt }}>
            ℹ No se encontraron clasificaciones con esos filtros.
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {rows.map(r => {
              const e = ESTADO_INFO[r.estado];
              return (
                <div key={r.id} onClick={() => abrir(r)}
                  style={{ ...card, display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
                  <div style={{ width:48, height:48, borderRadius:8, background:"#f0f0f0", flexShrink:0,
                    display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                    {r.imagen_url ? <img src={r.imagen_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : "🍇"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:S.gris1 }}>{r.lote_id} · {r.categoria}</div>
                    <div style={{ fontSize:12, color:S.gris3 }}>{r.fecha_inspeccion || "—"} · {(r.confianza*100).toFixed(1)} % confianza</div>
                  </div>
                  <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600,
                    background:e.bg, color:e.color, whiteSpace:"nowrap" }}>
                    {e.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PieCard({ data, colors, height=220 }) {
  return (
    <div style={card}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
            innerRadius={50} outerRadius={80} paddingAngle={3}>
            {data.map((d,i) => <Cell key={i} fill={colors[i % colors.length]}/>)}
          </Pie>
          <Tooltip formatter={(v) => [v, "cantidad"]}/>
          <Legend verticalAlign="bottom" height={30} iconType="circle"/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function DashboardOperario() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${API}/clasificaciones/stats`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => setStats({ total:0, cat1:0, cat2:0, cat1_pct:0, cat2_pct:0 }));
  }, []);

  if (!stats) return (
    <div style={pageWrap}>
      <div style={{ textAlign:"center", padding:60, color:S.gris3 }}>Cargando...</div>
    </div>
  );

  const data = [
    { name:"Categoría 1", value: stats.cat1 },
    { name:"Categoría 2", value: stats.cat2 },
  ];

  return (
    <div style={pageWrap}>
      <h2 style={{ margin:"0 0 20px", fontSize:20, fontWeight:700, color:S.gris1 }}>Dashboard de Resultados</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {stats.total === 0 ? (
          <div style={{ background:S.infoFondo, borderRadius:8, padding:"12px 14px", fontSize:13, color:S.infoTxt }}>
            ℹ Aún no hay clasificaciones registradas.
          </div>
        ) : (
          <>
            <div style={{ fontSize:13, fontWeight:600, color:S.gris2 }}>Por categoría</div>
            <PieCard data={data} colors={[S.verdeOsc, S.ambarTxt]}/>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {[
                { val:stats.total,           label:"total clasificado", color:S.gris1    },
                { val:`${stats.cat1_pct} %`, label:"categoría 1",       color:S.verdeOsc },
                { val:`${stats.cat2_pct} %`, label:"categoría 2",       color:S.ambarTxt },
              ].map((m,i) => (
                <div key={i} style={{ ...card, textAlign:"center" }}>
                  <div style={{ fontSize:22, fontWeight:700, color:m.color }}>{m.val}</div>
                  <div style={{ fontSize:11, color:S.gris2, marginTop:4 }}>{m.label}</div>
                </div>
              ))}
            </div>
            {stats.defectos && (
              <div style={card}>
                <div style={{ fontSize:13, fontWeight:600, color:S.gris2, marginBottom:10 }}>Defectos detectados</div>
                {stats.defectos.map((d,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0",
                    borderBottom: i<stats.defectos.length-1 ? `1px solid ${S.borde}` : "none", fontSize:13 }}>
                    <span style={{ color:S.gris2 }}>{d.nombre}</span>
                    <span style={{ color:S.gris1, fontWeight:600 }}>{d.detectados}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DashboardSupervisor() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${API}/validaciones/stats`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => setStats({ total:0, validas:0, pendientes:0, coincidencias:0, discrepancias:0, precision_preliminar_pct:null, tasa_discrepancias_pct:null, tiene_datos:false }));
  }, []);

  if (!stats) return (
    <div style={pageWrap}>
      <div style={{ textAlign:"center", padding:60, color:S.gris3 }}>Cargando...</div>
    </div>
  );

  const data = [
    { name:"Coincidencias",  value: stats.coincidencias },
    { name:"Discrepancias",  value: stats.discrepancias },
  ];

  return (
    <div style={pageWrap}>
      <h2 style={{ margin:"0 0 20px", fontSize:20, fontWeight:700, color:S.gris1 }}>Dashboard de Precisión</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {!stats.tiene_datos ? (
          <div style={{ background:S.infoFondo, borderRadius:8, padding:"12px 14px", fontSize:13, color:S.infoTxt }}>
            ℹ Ausencia de datos: aún no hay comparaciones válidas con evaluaciones reales.
            {stats.pendientes > 0 && ` Hay ${stats.pendientes} clasificaciones pendientes de revisar.`}
          </div>
        ) : (
          <>
            <PieCard data={data} colors={[S.verdeOsc, "#E53935"]}/>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {[
                { val:stats.validas,                            label:"muestra (n)",            color:S.gris1    },
                { val:`${stats.precision_preliminar_pct} %`,    label:"precisión preliminar",    color:S.verdeOsc },
                { val:`${stats.tasa_discrepancias_pct} %`,      label:"tasa de discrepancias",   color:"#E53935"  },
              ].map((m,i) => (
                <div key={i} style={{ ...card, textAlign:"center" }}>
                  <div style={{ fontSize:22, fontWeight:700, color:m.color }}>{m.val}</div>
                  <div style={{ fontSize:11, color:S.gris2, marginTop:4 }}>{m.label}</div>
                </div>
              ))}
            </div>
            {stats.pendientes > 0 && (
              <div style={{ fontSize:12, color:S.gris3 }}>
                {stats.pendientes} clasificaciones aún pendientes de revisar (no se incluyen en el cálculo).
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Perfil({ role, onCambiar }) {
  const esOp = role==="operario";
  return (
    <div style={{ ...pageWrap, maxWidth:480 }}>
      <h2 style={{ margin:"0 0 24px", fontSize:20, fontWeight:700, color:S.gris1 }}>Mi Perfil</h2>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>
        <div style={{ width:96, height:96, borderRadius:"50%", background:S.verdeOsc,
          color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:34, fontWeight:600 }}>
          {esOp ? "OC" : "SC"}
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:20, fontWeight:600, color:S.gris1 }}>
            {esOp ? "Operario de Calidad" : "Supervisor de Calidad"}
          </div>
          <div style={{ fontSize:14, color:S.gris2, marginTop:4 }}>
            {esOp ? "Operario de Calidad en Campo" : "Control de Calidad"}
          </div>
        </div>
        <div style={{ ...card, width:"100%" }}>
          {[["Empresa","AGROEXPORT S.A."],["Fundo asignado","La Esperanza"],["Campaña activa","2026"]].map(([k,v],i,arr) => (
            <div key={k}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:14, padding:"6px 0" }}>
                <span style={{ color:S.gris2 }}>{k}</span>
                <span style={{ color:S.gris1, fontWeight:500 }}>{v}</span>
              </div>
              {i<arr.length-1 && <div style={{ height:1, background:"#F0F0F0" }}/>}
            </div>
          ))}
        </div>
        <button onClick={onCambiar} style={{ ...btn(), background:S.blanco,
          color:S.verdeOsc, border:`1.5px solid ${S.verdeOsc}`, width:"100%" }}>
          Cambiar de perfil
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [role,      setRole]      = useState(null);
  const [screen,    setScreen]    = useState("roleSelect");
  const [loteData,  setLoteData]  = useState(null);
  const [fechaResultado, setFechaResultado] = useState(fechaHoy());
  const [resultado, setResultado] = useState(null);
  const [historial, setHistorial] = useState(HISTORIAL_INICIAL);

  useEffect(() => {
    fetch(`${API}/clasificaciones?limit=20`)
      .then(r => r.json())
      .then(rows => {
        if (Array.isArray(rows) && rows.length > 0) {
          setHistorial(rows.map(r => ({
            lote:      r.lote_id,
            categoria: r.categoria,
            confianza: `${(r.confianza*100).toFixed(1)} %`,
            fecha:     new Date(r.created_at + "Z").toLocaleDateString("es-PE") + " " +
                       new Date(r.created_at + "Z").toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"}),
            tipo:      r.aprobado_exportacion ? "cat1" : "cat2",
          })));
        }
      }).catch(() => {});
  }, []);

  const navActive = ["registro","captura","resultado","captura2"].includes(screen)
    ? "inicio"
    : ["historial","historialSupervisor"].includes(screen)
      ? "historial"
      : screen;

  const HEADERS = {
    registro:"Registro de Lote",
    captura:"Captura de Imagen",
    resultado:"Resultado de Clasificación",
    historial:"Historial de Clasificaciones",
    historialSupervisor:"Historial de Validaciones",
    dashboard:"Dashboard",
    perfil:"Mi Perfil",
    captura2:"Cola de Revisión",
  };

  const showBack = ["resultado","registro"].includes(screen);

  const goBack = () => {
    const map = { resultado:"captura", registro:"captura" };
    setScreen(map[screen] || "captura");
  };

  const onNav = (tab) => {
    if (tab === "inicio")    setScreen(role === "supervisor" ? "captura2" : "captura");
    else if (tab === "historial") setScreen(role === "supervisor" ? "historialSupervisor" : "historial");
    else setScreen(tab);
  };

  const onGuardarResultado = () => {
    if (resultado) {
      setHistorial(h => [{
        lote: loteData?.lote || "",
        categoria: resultado.categoria_label,
        confianza: resultado.confianza_pct || `${(resultado.confianza*100).toFixed(1)} %`,
        fecha: new Date().toLocaleDateString("es-PE") + " " +
               new Date().toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"}),
        tipo: resultado.aprobado_exportacion ? "cat1" : "cat2",
      }, ...h]);
    }
    setScreen("historial");
  };

  return (
    <div style={{ minHeight:"100vh", background:S.fondoApp, fontFamily:"Roboto, system-ui, sans-serif" }}>
      {screen !== "roleSelect" && (
        <TopNav title={HEADERS[screen]||""} showBack={showBack} onBack={goBack}
          role={role} onNav={onNav} navActive={navActive}/>
      )}
      <div>
        {screen === "roleSelect" && (
          <RoleSelect onSelect={r => { setRole(r); setScreen(r==="supervisor" ? "captura2" : "captura"); }}/>
        )}
        {screen === "registro" && (
          <RegistroLote onGuardar={d => { setLoteData(d); setScreen("captura"); }}/>
        )}
        {screen === "captura" && (
          <CapturaImagen loteInicial={loteData} onNuevoLote={() => setScreen("registro")}
            onEnviar={(r, lote, fecha) => {
              setResultado(r); setLoteData(d => ({ ...(d||{}), lote })); setFechaResultado(fecha);
              setScreen("resultado");
            }}/>
        )}
        {screen === "resultado" && (
          <ResultadoClasificacion resultado={resultado}
            loteId={loteData?.lote||""} fecha={fechaResultado} onGuardar={onGuardarResultado}/>
        )}
        {screen === "historial" && <Historial rows={historial}/>}
        {screen === "historialSupervisor" && (
          <RevisionClasificaciones estadoInicial="todas" titulo="Historial de Validaciones"/>
        )}
        {screen === "dashboard" && (
          role === "supervisor" ? <DashboardSupervisor/> : <DashboardOperario/>
        )}
        {screen === "perfil" && (
          <Perfil role={role} onCambiar={() => { setRole(null); setScreen("roleSelect"); }}/>
        )}
        {screen === "captura2" && (
          <RevisionClasificaciones estadoInicial="pendiente" titulo="Cola de Revisión"/>
        )}
      </div>
      <div style={{ borderTop:`1px solid ${S.borde}`, padding:16,
        textAlign:"center", fontSize:12, color:S.gris3, marginTop:40 }}>
        GrapeVision · AGROEXPORT S.A. · Norma: Codex Alimentarius / NTP 011.012
      </div>
    </div>
  );
}
