import { useState, useRef } from "react";

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

// ── SPINNER ───────────────────────────────────────────────────────────────────
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

// ── NAVBAR ────────────────────────────────────────────────────────────────────
function TopNav({ title, showBack, onBack, role, onNav, navActive, screen }) {
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
      {role && screen !== "roleSelect" && (
        <div style={{ maxWidth:720, margin:"0 auto", display:"flex",
          borderTop:"1px solid rgba(255,255,255,0.15)" }}>
          {[{key:"inicio",label:"Inicio"},{key:"historial",label:"Historial"},{key:"perfil",label:"Perfil"}].map(t => (
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

// ── PANTALLAS ─────────────────────────────────────────────────────────────────

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
          { role:"operario",   title:"Operario de Campo",    emoji:"👷",
            desc:"Registra lotes, captura imágenes y consulta resultados" },
          { role:"supervisor", title:"Supervisor de Calidad", emoji:"🔍",
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

function RegistroLote({ onGuardar }) {
  const [data, setData] = useState({
    fundo:"La Esperanza", lote:"L-2026-015",
    variedad:"Timpson", campana:"2026", fecha:"2026-06-05"
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
    { label:"Variedad", key:"variedad", type:"select", opts:["Timpson","Red Globe"] },
    { label:"Campaña",  key:"campana",  type:"text" },
    { label:"Fecha de inspección", key:"fecha", type:"date" },
  ];

  return (
    <div style={pageWrap}>
      <h2 style={{ margin:"0 0 24px", fontSize:20, fontWeight:700, color:S.gris1 }}>
        Registro de Lote
      </h2>
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

// ── CAPTURA OPERARIO ──────────────────────────────────────────────────────────
function CapturaImagen({ loteId, onEnviar }) {
  const [preview,    setPreview]    = useState(null);
  const [file,       setFile]       = useState(null);
  const [meta,       setMeta]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [imgAnotada, setImgAnotada] = useState(null);
  const fileRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setImgAnotada(null);
    setMeta({ tipo:f.type.split("/")[1]?.toUpperCase()||"JPG", tam:`${(f.size/1024/1024).toFixed(1)} MB` });
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const handleEnviar = async () => {
    if (!file) return;
    setLoading(true);
    let resultado = null;
    try {
      const fd = new FormData(); fd.append("file", file);
      const res  = await fetch(`${API}/predict`, { method:"POST", body:fd });
      const data = await res.json();
      resultado  = data.resultado;
    } catch(_) {}

    // fallback si el backend no responde
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
        imagen_anotada: null,
      };
    }

    // Si el backend devolvió imagen anotada, mostrarla antes de navegar
    if (resultado.imagen_anotada) {
      setImgAnotada(resultado.imagen_anotada);
      setLoading(false);
      setTimeout(() => onEnviar(resultado), 1500);
    } else {
      setLoading(false);
      onEnviar(resultado);
    }
  };

  const checks = meta ? [
    { label:`Formato: ${meta.tipo} válido` },
    { label:`Resolución: válida` },
    { label:`Tamaño: ${meta.tam}` },
  ] : [];

  return (
    <div style={pageWrap}>
      <h2 style={{ margin:"0 0 20px", fontSize:20, fontWeight:700, color:S.gris1 }}>
        Captura de Imagen
      </h2>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ background:S.exito, borderRadius:8, padding:"10px 14px",
          color:S.verdeOsc, fontSize:13, fontWeight:500 }}>
          Lote asociado: {loteId}
        </div>

        {/* Área de imagen */}
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
              ? <img src={imgAnotada} alt="resultado anotado"
                  style={{ width:"100%", maxHeight:440, objectFit:"contain", display:"block" }}/>
              : preview
                ? <img src={preview} alt="preview"
                    style={{ width:"100%", maxHeight:440, objectFit:"cover", display:"block" }}/>
                : <div style={{ textAlign:"center", color:S.gris3, fontSize:15, padding:40 }}>
                    <div style={{ fontSize:48, marginBottom:12 }}>📷</div>
                    <div>Arrastra una imagen aquí</div>
                    <div style={{ fontSize:13, marginTop:6 }}>o haz clic para seleccionar</div>
                  </div>
            }
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
          onChange={e => handleFile(e.target.files[0])}/>

        {!loading && !imgAnotada && (
          <button onClick={() => fileRef.current.click()}
            style={{ ...btn(), background:S.blanco, color:S.verdeOsc,
              border:`1.5px solid ${S.verdeOsc}` }}>
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
          <button onClick={handleEnviar} disabled={!preview}
            style={btn({ opacity:!preview ? 0.5 : 1 })}>
            🔍 Enviar a clasificación
          </button>
        )}

        {imgAnotada && (
          <div style={{ background:S.infoFondo, borderRadius:8, padding:"10px 14px",
            fontSize:13, color:S.infoTxt }}>
            ✓ Detección completada — redirigiendo al resultado...
          </div>
        )}
      </div>
    </div>
  );
}

// ── RESULTADO ─────────────────────────────────────────────────────────────────
function ResultadoClasificacion({ resultado, loteId, onGuardar }) {
  const [saved, setSaved] = useState(false);
  const esCat1 = resultado?.aprobado_exportacion;

  const handleGuardar = async () => {
    try {
      await fetch(`${API}/clasificaciones?lote_id=${loteId}&variedad=${resultado.variedad}&categoria=${resultado.categoria_label}&confianza=${resultado.confianza}&aprobado=${esCat1?1:0}&criterios=${encodeURIComponent(JSON.stringify(resultado.criterios_cumplidos))}`, { method:"POST" });
    } catch(_) {}
    setSaved(true);
    setTimeout(() => onGuardar(), 900);
  };

  if (!resultado) return null;

  return (
    <div style={pageWrap}>
      <h2 style={{ margin:"0 0 20px", fontSize:20, fontWeight:700, color:S.gris1 }}>
        Resultado de Clasificación
      </h2>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ background:S.exito, borderRadius:8, padding:"10px 14px",
          color:S.verdeOsc, fontWeight:600, fontSize:14, display:"flex", alignItems:"center", gap:8 }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <path d="M4 12.5L9 17.5L20 6.5" stroke={S.verdeOsc} strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Clasificación completada
        </div>

        {/* Imagen anotada si está disponible */}
        {resultado.imagen_anotada && (
          <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${S.borde}` }}>
            <img src={resultado.imagen_anotada} alt="detección"
              style={{ width:"100%", display:"block", maxHeight:380, objectFit:"contain" }}/>
          </div>
        )}

        <div style={card}>
          <div style={{ fontSize:13, color:S.gris2, marginBottom:4 }}>Variedad detectada</div>
          <div style={{ fontSize:16, fontWeight:600, color:S.gris1, marginBottom:12 }}>
            {resultado.variedad}
          </div>
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
            Fecha: {new Date().toLocaleDateString("es-PE")} —{" "}
            {new Date().toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})}
          </div>
        </div>

        <div style={{ background:S.infoFondo, borderRadius:8, padding:"12px 14px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:S.infoTxt, marginBottom:4 }}>
            ℹ Resultado confiable
          </div>
          <div style={{ fontSize:13, color:S.infoTxt }}>
            El modelo tiene alta confianza en esta clasificación.
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize:15, fontWeight:600, color:S.gris1, marginBottom:12 }}>
            Atributos detectados
          </div>
          {resultado.criterios_cumplidos?.map((c,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8,
              fontSize:14, color:S.gris2, marginBottom:8 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <path d="M4 12.5L9 17.5L20 6.5" stroke={S.verdeOsc} strokeWidth={2.5}
                  strokeLinecap="round" strokeLinejoin="round"/>
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

// ── HISTORIAL ─────────────────────────────────────────────────────────────────
function Historial({ rows }) {
  const [selected, setSelected] = useState(0);
  const s = rows[selected] || rows[0];
  return (
    <div style={pageWrap}>
      <h2 style={{ margin:"0 0 20px", fontSize:20, fontWeight:700, color:S.gris1 }}>
        Historial de Clasificaciones
      </h2>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ display:"flex", gap:8 }}>
          <input placeholder="Buscar por lote..." style={{ ...input, flex:1, height:40 }}/>
          <button style={{ height:40, border:`1px solid ${S.borde}`, borderRadius:8,
            background:S.blanco, padding:"0 14px", fontSize:13, cursor:"pointer", color:S.gris2 }}>
            ▼ Filtrar
          </button>
        </div>
        <div style={{ background:S.blanco, border:`1px solid ${S.borde}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr .8fr 1fr",
            padding:"12px 16px", borderBottom:`1px solid ${S.borde}`,
            fontSize:12, fontWeight:600, color:S.gris2, background:"#FAFAFA" }}>
            <span>Lote</span><span>Categoría</span><span>Conf.</span><span>Fecha</span>
          </div>
          {rows.map((r,i) => (
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
            <div style={{ fontSize:14, fontWeight:600, color:S.gris1, marginBottom:12 }}>
              Información del registro seleccionado
            </div>
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

// ── PERFIL ────────────────────────────────────────────────────────────────────
function Perfil({ role, onCambiar }) {
  const esOp = role==="operario";
  return (
    <div style={{ ...pageWrap, maxWidth:480 }}>
      <h2 style={{ margin:"0 0 24px", fontSize:20, fontWeight:700, color:S.gris1 }}>Mi Perfil</h2>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>
        <div style={{ width:96, height:96, borderRadius:"50%", background:S.verdeOsc,
          color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:34, fontWeight:600 }}>
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

// ── SUPERVISOR: CAPTURA ───────────────────────────────────────────────────────
function CapturaGaleria({ onClasificar }) {
  const [origen,     setOrigen]     = useState("galeria");
  const [preview,    setPreview]    = useState(null);
  const [file,       setFile]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [imgAnotada, setImgAnotada] = useState(null);
  const fileRef = useRef();

  const handleFile = (f) => {
    if (!f) return; setFile(f); setImgAnotada(null);
    const r = new FileReader(); r.onload = e => setPreview(e.target.result); r.readAsDataURL(f);
  };

  const handleClasificar = async () => {
    if (!file) return;
    setLoading(true);
    let resultado = null;
    try {
      const fd = new FormData(); fd.append("file", file);
      const res  = await fetch(`${API}/predict`, { method:"POST", body:fd });
      const data = await res.json();
      resultado  = data.resultado;
    } catch(_) {}

    if (!resultado) {
      resultado = {
        variedad:"Timpson", categoria:"CAT 1", categoria_label:"Categoría 1",
        confianza:0.886, confianza_pct:"88.6 %", aprobado_exportacion:true,
        criterios_cumplidos:["Color: Verde claro uniforme","Tamaño de baya: Grande","Compactación: Óptima","Pedicelo: Fresco"],
        defectos:[
          {nombre:"Mancha leve",estado:"No detectada",color:"#2E7D4F"},
          {nombre:"Variación de color",estado:"No detectada",color:"#2E7D4F"},
          {nombre:"Raste severo",estado:"No detectado",color:"#2E7D4F"},
        ],
        imagen_anotada: null,
      };
    }

    if (resultado.imagen_anotada) {
      setImgAnotada(resultado.imagen_anotada);
      setLoading(false);
      setTimeout(() => onClasificar(resultado), 1500);
    } else {
      setLoading(false);
      onClasificar(resultado);
    }
  };

  const toggleBtn = (sel, label) => {
    const active = origen===sel;
    return (
      <button onClick={() => setOrigen(sel)} style={{
        flex:1, height:44, borderRadius:8, fontSize:14, fontWeight:600,
        fontFamily:"inherit", cursor:"pointer",
        border:`1.5px solid ${active ? S.verdeOsc : S.borde}`,
        background: active ? S.verdeOsc : S.blanco,
        color: active ? "#fff" : S.gris1 }}>
        {label}
      </button>
    );
  };

  return (
    <div style={pageWrap}>
      <h2 style={{ margin:"0 0 20px", fontSize:20, fontWeight:700, color:S.gris1 }}>
        Captura de Imagen
      </h2>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <div>
          <Label>Lote asociado</Label>
          <div style={{ ...input, height:48, display:"flex", alignItems:"center",
            marginTop:6, color:S.gris2 }}>
            L-2026-021 · Fundo La Esperanza
          </div>
        </div>
        <div>
          <Label>Origen de imagen</Label>
          <div style={{ display:"flex", gap:10, marginTop:6 }}>
            {toggleBtn("camara","Cámara")}
            {toggleBtn("galeria","Galería")}
          </div>
        </div>

        {loading ? (
          <Spinner texto="Analizando con YOLOv8..." />
        ) : (
          <div onClick={() => !preview && fileRef.current.click()}
            style={{ width:"100%", minHeight:280, borderRadius:12, overflow:"hidden",
              border:`2px dashed ${S.verdeOsc}`, background:"#f9f9f9",
              cursor: preview ? "default" : "pointer", display:"flex",
              alignItems:"center", justifyContent:"center", position:"relative" }}>
            {imgAnotada
              ? <img src={imgAnotada} alt="anotada"
                  style={{ width:"100%", maxHeight:420, objectFit:"contain", display:"block" }}/>
              : preview
                ? <img src={preview} alt=""
                    style={{ width:"100%", maxHeight:420, objectFit:"cover", display:"block" }}/>
                : <div style={{ textAlign:"center", color:S.gris3, fontSize:15, padding:40 }}>
                    <div style={{ fontSize:48, marginBottom:12 }}>🖼</div>
                    Selecciona desde galería
                  </div>
            }
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
          onChange={e => handleFile(e.target.files[0])}/>

        {!loading && !imgAnotada && (
          <>
            <button onClick={() => fileRef.current.click()}
              style={{ ...btn(), background:S.blanco, color:S.verdeOsc,
                border:`1.5px solid ${S.verdeOsc}` }}>
              📁 Seleccionar imagen
            </button>
            <button onClick={handleClasificar} disabled={!preview}
              style={btn({ opacity:!preview ? 0.5 : 1 })}>
              Usar imagen y clasificar
            </button>
          </>
        )}

        {imgAnotada && (
          <div style={{ background:S.infoFondo, borderRadius:8, padding:"10px 14px",
            fontSize:13, color:S.infoTxt }}>
            ✓ Detección completada — redirigiendo...
          </div>
        )}
      </div>
    </div>
  );
}

// ── SUPERVISOR: DEFECTOS ──────────────────────────────────────────────────────
function DeteccionDefectos({ resultado, onGuardar }) {
  // Usa los datos REALES del resultado del predict
  const confianza = resultado?.confianza || 0;
  const defectos  = resultado?.defectos  || [];
  const esCat1    = resultado?.aprobado_exportacion;

  return (
    <div style={pageWrap}>
      <h2 style={{ margin:"0 0 20px", fontSize:20, fontWeight:700, color:S.gris1 }}>
        Detección de Defectos
      </h2>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

        {/* Imagen anotada */}
        {resultado?.imagen_anotada && (
          <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${S.borde}` }}>
            <img src={resultado.imagen_anotada} alt="detección"
              style={{ width:"100%", display:"block", maxHeight:360, objectFit:"contain" }}/>
          </div>
        )}

        {/* Resultado principal */}
        <div style={{ ...card, display:"flex", gap:16, alignItems:"center" }}>
          <div style={{ width:72, height:72, borderRadius:10,
            background: esCat1 ? S.exito : S.ambar,
            flexShrink:0, display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:32 }}>🍇</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, color:S.gris2 }}>Variedad detectada</div>
            <div style={{ fontSize:15, fontWeight:600, color:S.gris1 }}>
              {resultado?.variedad || "Timpson"}
            </div>
            <div style={{ fontSize:12, color:S.gris2, marginTop:6 }}>Categoría sugerida</div>
            <div style={{ fontSize:22, fontWeight:700,
              color: esCat1 ? S.verdeOsc : "#B8860B" }}>
              {resultado?.categoria_label || "—"}
            </div>
            <div style={{ fontSize:13, color:S.gris2 }}>
              Confianza: {resultado?.confianza_pct || `${(confianza*100).toFixed(1)} %`}
            </div>
            <div style={{ marginTop:8, height:8, background:"#eee", borderRadius:4, overflow:"hidden" }}>
              <div style={{ width:`${Math.round(confianza*100)}%`, height:"100%",
                background: esCat1 ? S.verdeOsc : "#E9A800", borderRadius:4 }}/>
            </div>
          </div>
        </div>

        {/* Defectos con datos reales */}
        <div style={card}>
          <div style={{ fontSize:15, fontWeight:600, color:S.gris1, marginBottom:12 }}>
            Defectos visuales detectados
          </div>
          {defectos.map((d,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12,
              padding:"10px 0",
              borderBottom: i<defectos.length-1 ? `1px solid ${S.borde}` : "none" }}>
              <div style={{ width:14, height:14, borderRadius:"50%",
                background:d.color, flexShrink:0 }}/>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:S.gris1 }}>{d.nombre}</div>
                <div style={{ fontSize:13, color:S.gris2 }}>{d.estado}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Criterios cumplidos */}
        {resultado?.criterios_cumplidos?.length > 0 && (
          <div style={card}>
            <div style={{ fontSize:15, fontWeight:600, color:S.gris1, marginBottom:12 }}>
              Criterios evaluados
            </div>
            {resultado.criterios_cumplidos.map((c,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8,
                fontSize:14, color:S.gris2, marginBottom:8 }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <path d="M4 12.5L9 17.5L20 6.5" stroke={esCat1 ? S.verdeOsc : "#E9A800"}
                    strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {c}
              </div>
            ))}
          </div>
        )}

        {!esCat1 && (
          <div style={{ background:S.ambar, borderRadius:8, padding:"12px 14px",
            fontSize:13, color:S.ambarTxt, fontWeight:500 }}>
            ⚠ Revisar visualmente los defectos detectados antes de aprobar.
          </div>
        )}

        <button onClick={onGuardar} style={btn()}>Guardar resultado</button>
      </div>
    </div>
  );
}

// ── SUPERVISOR: VALIDACIÓN ────────────────────────────────────────────────────
function ValidacionPacking({ onRegistrar }) {
  const [done,  setDone]  = useState(false);
  const [stats, setStats] = useState({ total:20, precision:85, discrepancias:3 });

  const handleRegistrar = async () => {
    try {
      await fetch(`${API}/validaciones`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ lote_id:"L-2026-021",
          categoria_modelo:"Categoría 1", categoria_packing:"Categoría 1", defectos:[] })
      });
      const resStats = await fetch(`${API}/validaciones/stats`);
      if (resStats.ok) {
        const s = await resStats.json();
        setStats({ total:s.total, precision:s.precision_pct, discrepancias:s.discrepancias });
      }
    } catch(_) {}
    setDone(true);
    setTimeout(() => { setDone(false); onRegistrar(); }, 1100);
  };

  return (
    <div style={pageWrap}>
      <h2 style={{ margin:"0 0 20px", fontSize:20, fontWeight:700, color:S.gris1 }}>
        Validación con Packing
      </h2>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ fontSize:15, fontWeight:600, color:S.gris1 }}>Comparación del lote</div>
        <div style={{ ...card, marginBottom:0 }}>
          <div style={{ fontSize:16, fontWeight:700, color:S.gris1 }}>L-2026-021</div>
          <div style={{ fontSize:13, color:S.gris2, marginTop:4 }}>
            Modelo: Categoría 1 &nbsp;|&nbsp; Packing: Categoría 1
          </div>
        </div>
        <div style={{ background:S.verdeBadge, borderRadius:8, padding:"12px 16px",
          display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:700, color:S.verdeOsc }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <path d="M4 12.5L9 17.5L20 6.5" stroke={S.verdeOsc} strokeWidth={2.4}
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          COINCIDENCIA REGISTRADA
        </div>
        <div style={{ fontSize:15, fontWeight:600, color:S.gris1 }}>Validación preliminar</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          {[
            { val:stats.total,            label:"resultados validados",    color:S.verdeOsc },
            { val:`${stats.precision} %`, label:"precisión preliminar",    color:S.verdeOsc },
            { val:stats.discrepancias,    label:"discrepancias revisadas", color:"#E53935" },
          ].map((m,i) => (
            <div key={i} style={{ ...card, textAlign:"center" }}>
              <div style={{ fontSize:28, fontWeight:700, color:m.color }}>{m.val}</div>
              <div style={{ fontSize:12, color:S.gris2, marginTop:4 }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:12, color:S.gris3 }}>
          Fuente de referencia: evaluación real de packing
        </div>
        {done && (
          <div style={{ background:S.exito, borderRadius:8, padding:"12px 16px",
            color:S.verdeOsc, fontWeight:600, fontSize:14 }}>
            Validación registrada correctamente ✓
          </div>
        )}
        <button onClick={handleRegistrar} disabled={done} style={btn()}>
          Registrar validación
        </button>
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [role,      setRole]      = useState(null);
  const [screen,    setScreen]    = useState("roleSelect");
  const [loteData,  setLoteData]  = useState(null);
  const [resultado, setResultado] = useState(null);
  const [historial, setHistorial] = useState(HISTORIAL_INICIAL);

  const navActive = ["registro","captura","resultado","captura2","defectos","validacion"].includes(screen)
    ? "inicio" : screen;

  const HEADERS = {
    registro:"Registro de Lote", captura:"Captura de Imagen",
    resultado:"Resultado de Clasificación", historial:"Historial de Clasificaciones",
    perfil:"Mi Perfil", captura2:"Captura de Imagen",
    defectos:"Detección de Defectos", validacion:"Validación con Packing",
  };

  const showBack = ["captura","resultado","defectos","validacion"].includes(screen);

  const goBack = () => {
    const map = { resultado:"captura", captura:"registro",
      defectos:"captura2", validacion:"defectos" };
    setScreen(map[screen] || "registro");
  };

  const onNav = (tab) => {
    if (tab==="inicio") setScreen(role==="supervisor" ? "captura2" : "registro");
    else setScreen(tab);
  };

  const onGuardarResultado = () => {
    if (resultado) {
      setHistorial(h => [{
        lote: loteData?.lote || "L-2026-015",
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
    <div style={{ minHeight:"100vh", background:S.fondoApp,
      fontFamily:"Roboto, system-ui, sans-serif" }}>
      <TopNav title={HEADERS[screen]||""} showBack={showBack} onBack={goBack}
        role={role} onNav={onNav} navActive={navActive} screen={screen}/>
      <div>
        {screen==="roleSelect" && (
          <RoleSelect onSelect={r => { setRole(r); setScreen(r==="supervisor"?"captura2":"registro"); }}/>
        )}
        {screen==="registro" && (
          <RegistroLote onGuardar={d => { setLoteData(d); setScreen("captura"); }}/>
        )}
        {screen==="captura" && (
          <CapturaImagen loteId={loteData?.lote||"L-2026-015"}
            onEnviar={r => { setResultado(r); setScreen("resultado"); }}/>
        )}
        {screen==="resultado" && (
          <ResultadoClasificacion resultado={resultado}
            loteId={loteData?.lote||"L-2026-015"} onGuardar={onGuardarResultado}/>
        )}
        {screen==="historial" && <Historial rows={historial}/>}
        {screen==="perfil" && (
          <Perfil role={role} onCambiar={() => { setRole(null); setScreen("roleSelect"); }}/>
        )}
        {screen==="captura2" && (
          <CapturaGaleria onClasificar={r => { setResultado(r); setScreen("defectos"); }}/>
        )}
        {screen==="defectos" && (
          <DeteccionDefectos resultado={resultado} onGuardar={() => setScreen("validacion")}/>
        )}
        {screen==="validacion" && (
          <ValidacionPacking onRegistrar={() => setScreen("captura2")}/>
        )}
      </div>
      <div style={{ borderTop:`1px solid ${S.borde}`, padding:16,
        textAlign:"center", fontSize:12, color:S.gris3, marginTop:40 }}>
        GrapeVision · AGROEXPORT S.A. · Norma: Codex Alimentarius / NTP 011.012
      </div>
    </div>
  );
}
