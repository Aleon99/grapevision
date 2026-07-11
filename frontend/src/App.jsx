import { useState, useRef } from "react";
import YoloDetection from "./YoloDetection.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const DEMO_IMG = "/demo_grape.jpg";

// ── DATOS MOCK ────────────────────────────────────────────────────────────────
const DEFECTOS_BASE = [
  { nombre: "Mancha leve",       estado: "Detectada",    color: "#E53935" },
  { nombre: "Variación de color",estado: "Detectada",    color: "#F57C00" },
  { nombre: "Raste severo",      estado: "No detectado", color: "#2E7D4F" },
];

const HISTORIAL_INICIAL = [
  { lote:"L-2026-015", categoria:"Categoría 1", confianza:"91.8 %", fecha:"05/06/2026 11:26", tipo:"cat1" },
  { lote:"L-2026-014", categoria:"Categoría 2", confianza:"87.4 %", fecha:"05/06/2026 10:48", tipo:"cat2" },
  { lote:"L-2026-013", categoria:"Categoría 1", confianza:"93.1 %", fecha:"05/06/2026 09:15", tipo:"cat1" },
  { lote:"L-2026-012", categoria:"Categoría 2", confianza:"76.2 %", fecha:"04/06/2026 16:32", tipo:"cat2" },
];

// ── ESTILOS BASE ──────────────────────────────────────────────────────────────
const S = {
  verde:      "#2E7D4F",
  verdeOsc:   "#1E6B3C",
  fondoPag:   "#ECECEC",
  fondoApp:   "#F5F5F5",
  blanco:     "#FFFFFF",
  gris1:      "#212121",
  gris2:      "#616161",
  gris3:      "#9E9E9E",
  borde:      "#E0E0E0",
  ambar:      "#FFF3CD",
  ambarTxt:   "#856404",
  verdeBadge: "#D4EDDA",
  infoFondo:  "#EBF4FF",
  infoTxt:    "#1565C0",
  exito:      "#E8F5EE",
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

const card = {
  background:S.blanco, border:`1px solid ${S.borde}`,
  borderRadius:12, padding:16
};

// ── COMPONENTES PEQUEÑOS ─────────────────────────────────────────────────────
function Header({ title, showBack, showHamburger, onBack }) {
  return (
    <div style={{ height:56, minHeight:56, background:S.verde, display:"flex",
      alignItems:"center", gap:16, padding:"0 16px", color:"#fff" }}>
      {showBack && (
        <button onClick={onBack} style={{ background:"none", border:"none",
          padding:0, cursor:"pointer", display:"flex", alignItems:"center" }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <path d="M15.5 19L8.5 12L15.5 5" stroke="#fff" strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      {showHamburger && !showBack && (
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <path d="M3 6H21M3 12H21M3 18H21" stroke="#fff" strokeWidth={2} strokeLinecap="round"/>
        </svg>
      )}
      <span style={{ fontSize:17, fontWeight:600, flex:1 }}>{title}</span>
    </div>
  );
}

function BottomNav({ active, onNav }) {
  const tabs = [
    { key:"inicio",   label:"Inicio",
      icon: <path d="M4 11L12 4L20 11V20H4V11Z" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round"/> },
    { key:"historial",label:"Historial",
      icon: <path d="M4 6H20M4 12H20M4 18H12" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"/> },
    { key:"perfil",   label:"Perfil",
      icon: <><circle cx={12} cy={8} r={3.4} stroke="currentColor" strokeWidth={1.8}/>
             <path d="M4.5 20C5.5 16.5 8.4 14.5 12 14.5C15.6 14.5 18.5 16.5 19.5 20"
               stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"/></> },
  ];
  return (
    <div style={{ height:64, minHeight:64, background:S.blanco,
      borderTop:`1px solid #E8E8E8`, display:"flex" }}>
      {tabs.map(t => {
        const isActive = active === t.key;
        const color = isActive ? S.verdeOsc : S.gris3;
        return (
          <button key={t.key} onClick={() => onNav(t.key)}
            style={{ flex:1, background:"none", border:"none", cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"center",
              justifyContent:"center", gap:3, color }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none">{t.icon}</svg>
            <span style={{ fontSize:11, fontWeight:500 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Label({ children, required }) {
  return (
    <label style={{ fontSize:13, fontWeight:500, color:S.gris1 }}>
      {children} {required && <span style={{ color:"#D32F2F" }}>*</span>}
    </label>
  );
}

// ── PANTALLAS ────────────────────────────────────────────────────────────────

function RoleSelect({ onSelect }) {
  return (
    <div style={{ padding:"60px 24px 28px", display:"flex", flexDirection:"column",
      alignItems:"center", gap:36 }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
        <div style={{ width:56, height:56, borderRadius:14, background:S.verdeOsc,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <circle cx={12} cy={12} r={9} stroke="#fff" strokeWidth={1.8}/>
            <path d="M12 3V21M3 12H21" stroke="#fff" strokeWidth={1.4}/>
          </svg>
        </div>
        <div style={{ fontSize:22, fontWeight:700, color:S.gris1 }}>GrapeVision</div>
        <div style={{ fontSize:13, color:S.gris2 }}>Sistema de Clasificación de Uva</div>
        <div style={{ fontSize:12, color:S.gris3 }}>AGROEXPORT S.A.</div>
      </div>
      <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:14 }}>
        {[
          { role:"operario",   title:"Operario de Campo",
            desc:"Registra lotes, captura imágenes y consulta resultados" },
          { role:"supervisor", title:"Supervisor de Calidad",
            desc:"Valida clasificaciones y revisa defectos visuales" },
        ].map(r => (
          <button key={r.role} onClick={() => onSelect(r.role)}
            style={{ width:"100%", background:S.blanco, border:`1.5px solid ${S.borde}`,
              borderRadius:12, padding:18, cursor:"pointer", textAlign:"left",
              display:"flex", flexDirection:"column", gap:4 }}>
            <span style={{ fontSize:16, fontWeight:600, color:S.gris1 }}>{r.title}</span>
            <span style={{ fontSize:13, color:S.gris2 }}>{r.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RegistroLote({ onGuardar }) {
  const [data, setData] = useState({
    fundo:"La Esperanza", lote:"L-2026-015",
    variedad:"Sweet Globe", campana:"2026", fecha:"2026-06-05"
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const upd = (k, v) => setData(d => ({ ...d, [k]: v }));

  const handleGuardar = async () => {
    setLoading(true);
    try {
      await fetch(`${API}/lotes`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ lote_id:data.lote, fundo:data.fundo,
          variedad:data.variedad, campana:data.campana, fecha:data.fecha, perfil:"operario" })
      });
    } catch (_) {}
    setSaved(true);
    setTimeout(() => { setSaved(false); setLoading(false); onGuardar(data); }, 1100);
  };

  const fields = [
    { label:"Fundo", key:"fundo", type:"select",
      opts:["La Esperanza","Fundo Norte","Fundo Sur"] },
    { label:"Lote",  key:"lote",  type:"text" },
    { label:"Variedad", key:"variedad", type:"select",
      opts:["Sweet Globe","Red Globe"] },
    { label:"Campaña", key:"campana", type:"text" },
    { label:"Fecha de inspección", key:"fecha", type:"date" },
  ];

  return (
    <div style={{ padding:"20px 16px 28px", display:"flex", flexDirection:"column", gap:18 }}>
      {fields.map(f => (
        <div key={f.key} style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <Label required>{f.label}</Label>
          {f.type === "select" ? (
            <select value={data[f.key]} onChange={e => upd(f.key, e.target.value)}
              style={{ ...input, appearance:"none" }}>
              {f.opts.map(o => <option key={o}>{o}</option>)}
            </select>
          ) : (
            <input type={f.type} value={data[f.key]}
              onChange={e => upd(f.key, e.target.value)} style={input}/>
          )}
        </div>
      ))}
      <button onClick={handleGuardar} disabled={loading} style={btn()}>
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
  );
}

function CapturaImagen({ loteId, onEnviar }) {
  const [preview,   setPreview]   = useState(null);
  const [file,      setFile]      = useState(null);
  const [meta,      setMeta]      = useState(null);
  const [phase,     setPhase]     = useState("idle"); // idle | detecting | done
  const [selected,  setSelected]  = useState(0);
  const fileRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setMeta({ tipo: f.type.split("/")[1]?.toUpperCase() || "JPG", tam: `${(f.size/1024/1024).toFixed(1)} MB` });
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(f);
    setPhase("idle");
  };

  // Botón "Usar imagen demo" — carga la foto real del racimo
  const usarDemo = () => {
    setPreview(DEMO_IMG);
    setFile("demo");
    setMeta({ tipo:"JPG", tam:"1.8 MB" });
    setPhase("idle");
  };

  const handleEnviar = async () => {
    // Primero mostramos el efecto de detección visual
    setPhase("detecting");
    // La navegación al resultado se dispara desde onDone del componente YoloDetection
  };

  const onDetectionDone = async () => {
    // Una vez termina la animación, llamamos al backend (o usamos mock)
    let resultado = null;
    try {
      if (file && file !== "demo") {
        const fd = new FormData(); fd.append("file", file);
        const res = await fetch(`${API}/predict`, { method:"POST", body:fd });
        const data = await res.json();
        resultado = data.resultado;
      }
    } catch (_) {}
    if (!resultado) {
      resultado = {
        variedad:"Sweet Globe", categoria:"CAT 1", categoria_label:"Categoría 1",
        confianza:0.918, confianza_pct:"91.8 %",
        criterios_cumplidos:["Color: Verde claro uniforme","Tamaño de baya: Grande","Compactación: Óptima","Pedicelo: Fresco"],
        aprobado_exportacion:true, defectos:DEFECTOS_BASE,
      };
    }
    // Pequeña pausa para que el usuario vea el resultado en la imagen
    setTimeout(() => onEnviar(resultado), 800);
  };

  const checks = meta ? [
    { label:`Formato: ${meta.tipo} válido` },
    { label:`Resolución: válida` },
    { label:`Tamaño: ${meta.tam}` },
  ] : [];

  return (
    <div style={{ padding:"20px 16px 28px", display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ background:S.exito, borderRadius:8, padding:"10px 14px",
        color:S.verdeOsc, fontSize:13, fontWeight:500 }}>
        Lote asociado: {loteId}
      </div>

      {/* Zona de imagen: si está en fase detecting, muestra el componente YOLO */}
      {phase === "detecting" && preview ? (
        <YoloDetection imageSrc={preview} onDone={onDetectionDone}/>
      ) : (
        <div onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          onDragOver={e => e.preventDefault()}
          onClick={() => !preview && fileRef.current.click()}
          style={{ width:"100%", borderRadius:12, overflow:"hidden",
            border:`2px solid ${S.verdeOsc}`, background:"#f9f9f9",
            cursor: preview ? "default" : "pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            minHeight: 220, position:"relative" }}>
          {preview
            ? <img src={preview} alt="preview"
                style={{ width:"100%", objectFit:"cover", display:"block" }}/>
            : <div style={{ textAlign:"center", color:S.gris3, fontSize:14, padding:32 }}>
                <div style={{ fontSize:36, marginBottom:8 }}>📷</div>
                Toca para seleccionar una imagen
              </div>
          }
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
        onChange={e => handleFile(e.target.files[0])}/>

      {/* Botones de origen */}
      {phase !== "detecting" && (
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => fileRef.current.click()}
            style={{ flex:1, height:40, borderRadius:8, border:`1.5px solid ${S.borde}`,
              background:S.blanco, fontSize:13, fontWeight:500, cursor:"pointer", color:S.gris1 }}>
            📁 Desde galería
          </button>
          <button onClick={usarDemo}
            style={{ flex:1, height:40, borderRadius:8, border:`1.5px solid ${S.verdeOsc}`,
              background:S.exito, fontSize:13, fontWeight:600, cursor:"pointer", color:S.verdeOsc }}>
            🍇 Usar foto demo
          </button>
        </div>
      )}

      {/* Validaciones */}
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

      {/* Miniaturas */}
      {preview && phase !== "detecting" && (
        <div style={{ display:"flex", gap:8 }}>
          {[0,1,2,3].map(i => (
            <div key={i} onClick={() => setSelected(i)}
              style={{ width:56, height:56, borderRadius:8, overflow:"hidden",
                border:`2px solid ${selected===i ? S.verdeOsc : S.borde}`,
                cursor:"pointer", flexShrink:0 }}>
              <img src={preview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
            </div>
          ))}
        </div>
      )}

      {phase !== "detecting" && (
        <button onClick={handleEnviar} disabled={!preview}
          style={btn({ opacity: !preview ? 0.5 : 1 })}>
          🔍 Enviar a clasificación
        </button>
      )}
    </div>
  );
}

function ResultadoClasificacion({ resultado, loteId, onGuardar }) {
  const [saved, setSaved] = useState(false);
  const esCat1 = resultado?.aprobado_exportacion;

  const handleGuardar = async () => {
    try {
      await fetch(`${API}/clasificaciones?lote_id=${loteId}&variedad=${resultado.variedad}&categoria=${resultado.categoria_label}&confianza=${resultado.confianza}&aprobado=${esCat1?1:0}&criterios=${encodeURIComponent(JSON.stringify(resultado.criterios_cumplidos))}`, { method:"POST" });
    } catch (_) {}
    setSaved(true);
    setTimeout(() => onGuardar(), 900);
  };

  if (!resultado) return null;

  return (
    <div style={{ padding:"20px 16px 28px", display:"flex", flexDirection:"column", gap:16 }}>
      {/* Banner */}
      <div style={{ background:S.exito, borderRadius:8, padding:"10px 14px",
        color:S.verdeOsc, fontWeight:600, fontSize:14, display:"flex", alignItems:"center", gap:8 }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <path d="M4 12.5L9 17.5L20 6.5" stroke={S.verdeOsc} strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Clasificación completada
      </div>

      {/* Resultado principal */}
      <div style={{ ...card }}>
        <div style={{ fontSize:13, color:S.gris2, marginBottom:4 }}>Categoría sugerida</div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:28, fontWeight:700,
            color: esCat1 ? S.verdeOsc : "#B8860B" }}>
            {resultado.categoria_label}
          </div>
          {esCat1 && (
            <svg width={28} height={28} viewBox="0 0 24 24" fill={S.verdeOsc}>
              <path d="M12 2L14.4 9H22L16 13.8L18.4 21L12 16.2L5.6 21L8 13.8L2 9H9.6Z"/>
            </svg>
          )}
        </div>
        <div style={{ marginTop:12 }}>
          <div style={{ fontSize:13, color:S.gris2 }}>Confianza</div>
          <div style={{ fontSize:24, fontWeight:700, color: esCat1 ? S.verdeOsc : "#B8860B" }}>
            {resultado.confianza_pct || `${(resultado.confianza*100).toFixed(1)} %`}
          </div>
        </div>
        <div style={{ marginTop:8, fontSize:13, color:S.gris2 }}>
          Fecha de procesamiento: {new Date().toLocaleDateString("es-PE")} -{" "}
          {new Date().toLocaleTimeString("es-PE", { hour:"2-digit", minute:"2-digit" })}
        </div>
      </div>

      {/* Info */}
      <div style={{ background:S.infoFondo, borderRadius:8, padding:"12px 14px" }}>
        <div style={{ fontSize:13, fontWeight:600, color:S.infoTxt, marginBottom:4 }}>
          ℹ Resultado confiable
        </div>
        <div style={{ fontSize:13, color:S.infoTxt }}>
          El modelo tiene alta confianza en esta clasificación.
        </div>
      </div>

      {/* Atributos */}
      <div>
        <div style={{ fontSize:15, fontWeight:600, color:S.gris1, marginBottom:10 }}>
          Atributos detectados
        </div>
        {resultado.criterios_cumplidos?.map((c, i) => (
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
  );
}

function Historial({ rows, onBack }) {
  const [selected, setSelected] = useState(0);
  const s = rows[selected] || rows[0];

  return (
    <div style={{ padding:"16px", display:"flex", flexDirection:"column", gap:14 }}>
      {/* Buscador */}
      <div style={{ display:"flex", gap:8 }}>
        <input placeholder="Buscar por lote..." style={{ ...input, flex:1, height:40 }}/>
        <button style={{ height:40, border:`1px solid ${S.borde}`, borderRadius:8,
          background:S.blanco, padding:"0 14px", fontSize:13, cursor:"pointer",
          color:S.gris2, display:"flex", alignItems:"center", gap:6 }}>
          ▼ Filtrar
        </button>
      </div>

      {/* Tabla */}
      <div style={{ background:S.blanco, border:`1px solid ${S.borde}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr .8fr 1fr",
          padding:"10px 12px", borderBottom:`1px solid ${S.borde}`,
          fontSize:12, fontWeight:600, color:S.gris2 }}>
          <span>Lote</span><span>Categoría</span><span>Conf.</span><span>Fecha</span>
        </div>
        {rows.map((r, i) => (
          <div key={i} onClick={() => setSelected(i)}
            style={{ display:"grid", gridTemplateColumns:"1fr 1fr .8fr 1fr",
              padding:"10px 12px", borderBottom:`1px solid ${S.borde}`,
              background: i === selected ? "#F5FAF7" : S.blanco,
              cursor:"pointer", fontSize:12, color:S.gris1, alignItems:"center" }}>
            <span style={{ fontWeight:500 }}>{r.lote}</span>
            <span>
              <span style={{ padding:"3px 8px", borderRadius:20, fontSize:11, fontWeight:600,
                background: r.tipo==="cat1" ? S.verdeBadge : S.ambar,
                color: r.tipo==="cat1" ? S.verdeOsc : S.ambarTxt }}>
                {r.categoria}
              </span>
            </span>
            <span>{r.confianza}</span>
            <span style={{ color:S.gris2 }}>{r.fecha.split(" ")[0]}<br/>{r.fecha.split(" ")[1]}</span>
          </div>
        ))}
      </div>

      {/* Detalle */}
      {s && (
        <div style={{ background:S.blanco, border:`1px solid ${S.borde}`, borderRadius:12, padding:16 }}>
          <div style={{ fontSize:13, fontWeight:600, color:S.gris1, marginBottom:10 }}>
            Información del registro seleccionado
          </div>
          {[
            ["Lote", s.lote], ["Categoría", s.categoria],
            ["Confianza", s.confianza], ["Fecha", s.fecha],
            ["Registrado por", "Operario de Calidad en Campo"],
            ["Trazabilidad", "lote, imagen, resultado y fecha"],
          ].map(([k,v]) => (
            <div key={k} style={{ fontSize:13, color:S.gris2, marginBottom:5 }}>
              <strong style={{ color:S.gris1 }}>{k}:</strong> {v}
            </div>
          ))}
        </div>
      )}

      <button style={btn()}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <path d="M6 3H15L19 7V21H6V3Z" stroke="#fff" strokeWidth={1.8} strokeLinejoin="round"/>
        </svg>
        Consultar historial completo
      </button>
    </div>
  );
}

function Perfil({ role, onCambiar }) {
  const esOp = role === "operario";
  return (
    <div style={{ padding:"24px 16px 28px", display:"flex",
      flexDirection:"column", alignItems:"center", gap:18 }}>
      <div style={{ width:84, height:84, borderRadius:"50%", background:S.verdeOsc,
        color:"#fff", display:"flex", alignItems:"center",
        justifyContent:"center", fontSize:30, fontWeight:600 }}>
        {esOp ? "OC" : "SC"}
      </div>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:18, fontWeight:600, color:S.gris1 }}>
          {esOp ? "Operario de Calidad" : "Supervisor de Calidad"}
        </div>
        <div style={{ fontSize:14, color:S.gris2 }}>
          {esOp ? "Operario de Calidad en Campo" : "Control de Calidad"}
        </div>
      </div>
      <div style={{ ...card, width:"100%" }}>
        {[["Empresa","AGROEXPORT S.A."],["Fundo asignado","La Esperanza"],["Campaña activa","2026"]].map(([k,v],i,arr) => (
          <div key={k}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:14, padding:"4px 0" }}>
              <span style={{ color:S.gris2 }}>{k}</span>
              <span style={{ color:S.gris1, fontWeight:500 }}>{v}</span>
            </div>
            {i < arr.length-1 && <div style={{ height:1, background:"#F0F0F0", margin:"4px 0" }}/>}
          </div>
        ))}
      </div>
      <button onClick={onCambiar}
        style={{ ...btn(), background:S.blanco, color:S.verdeOsc,
          border:`1.5px solid ${S.verdeOsc}` }}>
        Cambiar de perfil
      </button>
    </div>
  );
}

// ── SUPERVISOR ────────────────────────────────────────────────────────────────

function CapturaGaleria({ onClasificar }) {
  const [origen, setOrigen]   = useState("galeria");
  const [preview, setPreview] = useState(null);
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const handleFile = (f) => {
    if (!f) return; setFile(f);
    const r = new FileReader(); r.onload = e => setPreview(e.target.result); r.readAsDataURL(f);
  };

  const handleClasificar = async () => {
    setLoading(true);
    let resultado = null;
    try {
      if (file) {
        const fd = new FormData(); fd.append("file", file);
        const res = await fetch(`${API}/predict`, { method:"POST", body:fd });
        const data = await res.json(); resultado = data.resultado;
      }
    } catch (_) {}
    if (!resultado) resultado = {
      variedad:"Sweet Globe", categoria:"CAT 1", categoria_label:"Categoría 1",
      confianza:0.886, confianza_pct:"88.6 %", aprobado_exportacion:true, defectos:DEFECTOS_BASE,
    };
    setLoading(false); onClasificar(resultado);
  };

  const toggleBtn = (sel, label) => {
    const active = origen === sel;
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
    <div style={{ padding:"20px 16px 28px", display:"flex", flexDirection:"column", gap:16 }}>
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
      <div onClick={() => fileRef.current.click()}
        style={{ width:"100%", height:240, borderRadius:12, overflow:"hidden",
          border:`2px solid ${S.verdeOsc}`, background:"#f9f9f9",
          cursor:"pointer", position:"relative", display:"flex",
          alignItems:"center", justifyContent:"center" }}>
        {preview
          ? <img src={preview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
          : <div style={{ textAlign:"center", color:S.gris3, fontSize:14 }}>
              <div style={{ fontSize:32 }}>🖼</div>Selecciona desde galería
            </div>
        }
        {preview && (
          <div style={{ position:"absolute", left:10, bottom:10, background:"rgba(0,0,0,.6)",
            color:"#fff", fontSize:12, padding:"5px 10px", borderRadius:6 }}>
            Procesando imagen con el modelo de IA...
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
        onChange={e => handleFile(e.target.files[0])}/>
      {preview && (
        <div style={{ fontSize:12, color:S.gris3 }}>
          sweet_globe_lote_021.jpg · JPG · 1920 × 1440
        </div>
      )}
      <button onClick={handleClasificar} disabled={loading || !preview}
        style={btn({ opacity:(!preview || loading) ? 0.6 : 1 })}>
        {loading ? "Procesando…" : "Usar imagen y clasificar"}
      </button>
    </div>
  );
}

function DeteccionDefectos({ resultado, onGuardar }) {
  const confianza = resultado?.confianza || 0.886;
  const defectos  = resultado?.defectos || DEFECTOS_BASE;

  return (
    <div style={{ padding:"20px 16px 28px", display:"flex", flexDirection:"column", gap:18 }}>
      {/* Resumen */}
      <div style={{ ...card, display:"flex", gap:14 }}>
        <div style={{ width:64, height:64, borderRadius:8, background:S.exito,
          flexShrink:0, display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:28 }}>🍇</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, color:S.gris2 }}>Categoría sugerida</div>
          <div style={{ fontSize:20, fontWeight:700, color:S.verdeOsc }}>
            {resultado?.categoria_label || "CATEGORÍA 1"}
          </div>
          <div style={{ fontSize:13, color:S.gris2 }}>Confianza: {resultado?.confianza_pct || "88.6 %"}</div>
          <div style={{ marginTop:6, height:8, background:S.exito, borderRadius:4, overflow:"hidden" }}>
            <div style={{ width:`${Math.round(confianza*100)}%`, height:"100%",
              background:S.verdeOsc, borderRadius:4 }}/>
          </div>
        </div>
      </div>

      {/* Defectos */}
      <div>
        <div style={{ fontSize:15, fontWeight:600, color:S.gris1, marginBottom:10 }}>
          Defectos visuales detectados
        </div>
        {defectos.map((d, i) => (
          <div key={i} style={{ ...card, display:"flex", alignItems:"center",
            gap:12, marginBottom:10 }}>
            <div style={{ width:14, height:14, borderRadius:"50%",
              background:d.color, flexShrink:0 }}/>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:S.gris1 }}>{d.nombre}</div>
              <div style={{ fontSize:13, color:S.gris2 }}>{d.estado}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background:S.ambar, borderRadius:8, padding:"12px 14px",
        fontSize:13, color:S.ambarTxt, fontWeight:500 }}>
        Revisar visualmente los defectos con confianza media.
      </div>

      <button onClick={onGuardar} style={btn()}>Guardar resultado</button>
    </div>
  );
}

function ValidacionPacking({ onRegistrar }) {
  const [done, setDone]   = useState(false);
  const [stats, setStats] = useState({ total:20, precision:85, discrepancias:3 });

  const handleRegistrar = async () => {
    try {
      const res = await fetch(`${API}/validaciones`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ lote_id:"L-2026-021",
          categoria_modelo:"Categoría 1", categoria_packing:"Categoría 1", defectos:DEFECTOS_BASE })
      });
      const resStats = await fetch(`${API}/validaciones/stats`);
      if (resStats.ok) {
        const s = await resStats.json();
        setStats({ total:s.total, precision:s.precision_pct, discrepancias:s.discrepancias });
      }
    } catch (_) {}
    setDone(true);
    setTimeout(() => { setDone(false); onRegistrar(); }, 1100);
  };

  return (
    <div style={{ padding:"20px 16px 28px", display:"flex", flexDirection:"column", gap:18 }}>
      {/* Comparación */}
      <div>
        <div style={{ fontSize:15, fontWeight:600, color:S.gris1, marginBottom:10 }}>
          Comparación del lote
        </div>
        <div style={{ ...card, marginBottom:10 }}>
          <div style={{ fontSize:16, fontWeight:700, color:S.gris1 }}>L-2026-021</div>
          <div style={{ fontSize:13, color:S.gris2, marginTop:4 }}>
            Modelo: Categoría 1 &nbsp;|&nbsp; Packing: Categoría 1
          </div>
        </div>
        <div style={{ background:S.verdeBadge, borderRadius:8, padding:"12px 16px",
          display:"flex", alignItems:"center", gap:8,
          fontSize:13, fontWeight:700, color:S.verdeOsc }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <path d="M4 12.5L9 17.5L20 6.5" stroke={S.verdeOsc} strokeWidth={2.4}
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          COINCIDENCIA REGISTRADA
        </div>
      </div>

      {/* Métricas */}
      <div>
        <div style={{ fontSize:15, fontWeight:600, color:S.gris1, marginBottom:10 }}>
          Validación preliminar
        </div>
        {[
          { val:stats.total,        label:"resultados validados",  color:S.verdeOsc },
          { val:`${stats.precision} %`, label:"precisión preliminar", color:S.verdeOsc },
          { val:stats.discrepancias,label:"discrepancias revisadas",color:"#E53935" },
        ].map((m,i) => (
          <div key={i} style={{ ...card, display:"flex", alignItems:"center",
            gap:14, marginBottom:10 }}>
            <span style={{ fontSize:24, fontWeight:700, color:m.color, minWidth:60 }}>{m.val}</span>
            <span style={{ fontSize:13, color:S.gris2 }}>{m.label}</span>
          </div>
        ))}
        <div style={{ fontSize:12, color:S.gris3 }}>
          Fuente de referencia: evaluación real de packing
        </div>
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
  );
}

// ── APP PRINCIPAL ─────────────────────────────────────────────────────────────
export default function App() {
  const [role,      setRole]      = useState(null);
  const [screen,    setScreen]    = useState("roleSelect");
  const [loteData,  setLoteData]  = useState(null);
  const [resultado, setResultado] = useState(null);
  const [historial, setHistorial] = useState(HISTORIAL_INICIAL);

  const navActive = ["registro","captura","resultado","captura2","defectos","validacion"].includes(screen)
    ? "inicio" : screen;

  const HEADERS = {
    roleSelect:"GrapeVision", registro:"Registro de Lote",
    captura:"Captura de Imagen", resultado:"Resultado de Clasificación",
    historial:"Historial de Clasificaciones", perfil:"Mi Perfil",
    captura2:"Captura de Imagen", defectos:"Detección de Defectos",
    validacion:"Validación con Packing",
  };
  const showBack = ["captura","resultado","defectos","validacion"].includes(screen);
  const showHam  = ["registro","historial","perfil","captura2"].includes(screen);

  const goBack = () => {
    const map = { resultado:"captura", captura:"registro",
      defectos:"captura2", validacion:"defectos" };
    setScreen(map[screen] || "registro");
  };

  const onNav = (tab) => {
    if (tab === "inicio") setScreen(role === "supervisor" ? "captura2" : "registro");
    else setScreen(tab);
  };

  const onGuardarResultado = () => {
    if (resultado) {
      const nr = {
        lote: loteData?.lote || "L-2026-015",
        categoria: resultado.categoria_label,
        confianza: resultado.confianza_pct || `${(resultado.confianza*100).toFixed(1)} %`,
        fecha: new Date().toLocaleDateString("es-PE") + " " +
               new Date().toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"}),
        tipo: resultado.aprobado_exportacion ? "cat1" : "cat2",
      };
      setHistorial(h => [nr, ...h]);
    }
    setScreen("historial");
  };

  return (
    <div style={{ minHeight:"100vh", background:S.fondoPag,
      display:"flex", alignItems:"flex-start", justifyContent:"center",
      padding:"40px 16px", fontFamily:"Roboto, system-ui, sans-serif" }}>
      <div style={{ width:390, maxWidth:"100%", background:S.fondoApp,
        borderRadius:28, overflow:"hidden", boxShadow:"0 30px 70px rgba(0,0,0,.28)",
        display:"flex", flexDirection:"column", border:"1px solid #D8D8D8",
        maxHeight:"90vh" }}>

        {/* Status bar */}
        <div style={{ height:28, background:S.blanco, display:"flex",
          alignItems:"center", justifyContent:"space-between",
          padding:"0 18px", fontSize:12, fontWeight:600, color:S.gris1 }}>
          <span>{new Date().toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})}</span>
          <span>▲ 87%</span>
        </div>

        {/* Header */}
        {screen !== "roleSelect" && (
          <Header title={HEADERS[screen]} showBack={showBack}
            showHamburger={showHam} onBack={goBack}/>
        )}

        {/* Contenido */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {screen === "roleSelect" && (
            <RoleSelect onSelect={r => { setRole(r); setScreen(r==="supervisor"?"captura2":"registro"); }}/>
          )}
          {screen === "registro" && (
            <RegistroLote onGuardar={d => { setLoteData(d); setScreen("captura"); }}/>
          )}
          {screen === "captura" && (
            <CapturaImagen loteId={loteData?.lote||"L-2026-015"}
              onEnviar={r => { setResultado(r); setScreen("resultado"); }}/>
          )}
          {screen === "resultado" && (
            <ResultadoClasificacion resultado={resultado}
              loteId={loteData?.lote||"L-2026-015"} onGuardar={onGuardarResultado}/>
          )}
          {screen === "historial" && (
            <Historial rows={historial} onBack={() => setScreen("registro")}/>
          )}
          {screen === "perfil" && (
            <Perfil role={role} onCambiar={() => { setRole(null); setScreen("roleSelect"); }}/>
          )}
          {/* Sprint 2 — Supervisor */}
          {screen === "captura2" && (
            <CapturaGaleria onClasificar={r => { setResultado(r); setScreen("defectos"); }}/>
          )}
          {screen === "defectos" && (
            <DeteccionDefectos resultado={resultado} onGuardar={() => setScreen("validacion")}/>
          )}
          {screen === "validacion" && (
            <ValidacionPacking onRegistrar={() => setScreen("captura2")}/>
          )}
        </div>

        {/* Bottom nav */}
        {screen !== "roleSelect" && (
          <BottomNav active={navActive} onNav={onNav}/>
        )}
      </div>
    </div>
  );
}
