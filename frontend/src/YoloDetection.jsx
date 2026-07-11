import { useState, useEffect, useRef } from "react";

// Detecciones simuladas sobre la imagen del racimo (747x1280 → normalizado 0-1)
// El racimo ocupa prácticamente toda la imagen centrado
const DETECTIONS = [
  {
    label: "Sweet Globe",
    categoria: "CAT 1",
    conf: 0.918,
    // x, y, w, h en porcentaje de la imagen
    x: 0.04, y: 0.03, w: 0.90, h: 0.94,
    color: "#00C851",
  },
  // sub-detección: zona de bayas individuales (parte central densa)
  {
    label: "Racimo denso",
    categoria: "CAT 1",
    conf: 0.856,
    x: 0.12, y: 0.18, w: 0.70, h: 0.55,
    color: "#00C851",
  },
];

const SCAN_DURATION = 2200; // ms del efecto de escaneo

export default function YoloDetection({ imageSrc, onDone }) {
  const [phase, setPhase]         = useState("scanning"); // scanning | boxes | done
  const [scanY, setScanY]         = useState(0);
  const [visibleBoxes, setVisible] = useState([]);
  const rafRef = useRef();
  const startRef = useRef(Date.now());

  // Fase 1: línea de escaneo baja de arriba a abajo
  useEffect(() => {
    if (phase !== "scanning") return;
    startRef.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startRef.current;
      const progress = Math.min(elapsed / SCAN_DURATION, 1);
      setScanY(progress * 100);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setPhase("boxes");
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  // Fase 2: boxes aparecen uno a uno
  useEffect(() => {
    if (phase !== "boxes") return;
    let i = 0;
    const show = () => {
      if (i >= DETECTIONS.length) {
        setTimeout(() => { setPhase("done"); onDone?.(); }, 600);
        return;
      }
      setVisible(v => [...v, DETECTIONS[i]]);
      i++;
      setTimeout(show, 350);
    };
    setTimeout(show, 150);
  }, [phase]);

  return (
    <div style={{ position: "relative", width: "100%", borderRadius: 12,
      overflow: "hidden", background: "#000", aspectRatio: "747/1280" }}>

      {/* Imagen base */}
      <img src={imageSrc} alt="racimo"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block",
          filter: phase === "done" ? "none" : "brightness(0.85)" }}/>

      {/* Overlay oscuro mientras escanea */}
      {phase === "scanning" && (
        <div style={{ position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.25)", pointerEvents: "none" }}/>
      )}

      {/* Línea de escaneo */}
      {phase === "scanning" && (
        <>
          {/* Línea verde */}
          <div style={{
            position: "absolute", left: 0, right: 0,
            top: `${scanY}%`, height: 2,
            background: "linear-gradient(90deg, transparent 0%, #00C851 20%, #00ff66 50%, #00C851 80%, transparent 100%)",
            boxShadow: "0 0 8px #00C851, 0 0 20px rgba(0,200,81,0.4)",
            pointerEvents: "none",
            transition: "top 0.016s linear",
          }}/>
          {/* Glow debajo de la línea */}
          <div style={{
            position: "absolute", left: 0, right: 0,
            top: `${scanY}%`, height: 40,
            background: "linear-gradient(180deg, rgba(0,200,81,0.15) 0%, transparent 100%)",
            pointerEvents: "none",
          }}/>
          {/* Label de procesamiento */}
          <div style={{
            position: "absolute", bottom: 12, left: 12,
            background: "rgba(0,0,0,0.7)", color: "#00C851",
            fontSize: 11, fontWeight: 600, fontFamily: "monospace",
            padding: "5px 10px", borderRadius: 4,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ animation: "blink 0.8s step-end infinite" }}>▶</span>
            YOLOv8m · procesando...
          </div>
        </>
      )}

      {/* Bounding boxes */}
      {visibleBoxes.filter(Boolean).map((det, i) => (
        <div key={i} style={{
          position: "absolute",
          left:   `${det.x * 100}%`,
          top:    `${det.y * 100}%`,
          width:  `${det.w * 100}%`,
          height: `${det.h * 100}%`,
          border: `2px solid ${det.color}`,
          borderRadius: 4,
          boxShadow: `0 0 0 1px rgba(0,200,81,0.3), inset 0 0 30px rgba(0,200,81,0.08)`,
          animation: "fadeIn 0.25s ease-out",
          pointerEvents: "none",
        }}>
          {/* Label del box */}
          <div style={{
            position: "absolute", top: -22, left: -1,
            background: det.color, color: "#000",
            fontSize: 11, fontWeight: 700, fontFamily: "monospace",
            padding: "2px 8px", borderRadius: "3px 3px 0 0",
            whiteSpace: "nowrap",
          }}>
            {det.label} · {det.categoria} · {Math.round(det.conf * 100)}%
          </div>

          {/* Esquinas estilo YOLO */}
          {[
            { top:0, left:0, borderTop:`3px solid ${det.color}`, borderLeft:`3px solid ${det.color}`, borderRadius:"4px 0 0 0" },
            { top:0, right:0, borderTop:`3px solid ${det.color}`, borderRight:`3px solid ${det.color}`, borderRadius:"0 4px 0 0" },
            { bottom:0, left:0, borderBottom:`3px solid ${det.color}`, borderLeft:`3px solid ${det.color}`, borderRadius:"0 0 0 4px" },
            { bottom:0, right:0, borderBottom:`3px solid ${det.color}`, borderRight:`3px solid ${det.color}`, borderRadius:"0 0 4px 0" },
          ].map((s, j) => (
            <div key={j} style={{ position:"absolute", width:14, height:14, ...s }}/>
          ))}
        </div>
      ))}

      {/* Badge final de resultado */}
      {phase === "done" && (
        <div style={{
          position: "absolute", bottom: 10, left: 10, right: 10,
          background: "rgba(0,0,0,0.82)", borderRadius: 8,
          padding: "10px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          animation: "fadeIn 0.3s ease-out",
        }}>
          <div>
            <div style={{ color: "#9E9E9E", fontSize: 11, fontFamily:"monospace" }}>
              YOLOv8m · {DETECTIONS.length} objeto(s) detectado(s)
            </div>
            <div style={{ color: "#00C851", fontSize: 15, fontWeight: 700, marginTop: 2 }}>
              ✓ Sweet Globe · Categoría 1
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ color:"#00C851", fontSize:18, fontWeight:700 }}>91.8%</div>
            <div style={{ color:"#9E9E9E", fontSize:10 }}>confianza</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform: scale(0.97); } to { opacity:1; transform: scale(1); } }
        @keyframes blink  { 0%,100% { opacity:1; } 50% { opacity:0; } }
      `}</style>
    </div>
  );
}
