// ══════════════════════════════════════════════════════════════════════════════
// SupportButton – Floating Feedback/Support Widget
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { MessageSquare, AlertTriangle, Zap, Star, Paperclip, CheckSquare, Upload } from "lucide-react";
import { apiFetch } from "../api.js";

function SupportButton() {
  const [offen, setOffen] = useState(false);
  const [text, setText] = useState("");
  const [typ, setTyp] = useState("bug"); // "bug" | "idee" | "lob"
  const [status, setStatus] = useState(""); // "" | "sending" | "ok" | "err"
  const [datei, setDatei] = useState(null);

  async function senden() {
    if (!text.trim()) return;
    setStatus("sending");
    try {
      // Base64-Datei falls vorhanden
      let dateiBase64 = null, dateiName = null;
      if (datei) {
        dateiBase64 = await new Promise(res => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.readAsDataURL(datei);
        });
        dateiName = datei.name;
      }
      await apiFetch("/support", "POST", { typ, text, dateiBase64, dateiName, ts: new Date().toISOString() }, 10000, true);
      setStatus("ok");
      setTimeout(() => { setOffen(false); setText(""); setDatei(null); setStatus(""); }, 2500);
    } catch(e) {
      console.error("Support-Fehler:", e);
      setStatus("err");
    }
  }

  return (
    <>
      {/* Floating Button – Liquid Glass */}
      <button onClick={() => setOffen(true)}
        style={{
          position: "fixed", bottom: 72, right: 20, zIndex: 900,
          width: 48, height: 48, borderRadius: "50%", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(14,10,4,0.58)",
          backdropFilter: "blur(28px) saturate(200%) brightness(1.1)",
          WebkitBackdropFilter: "blur(28px) saturate(200%) brightness(1.1)",
          border: "1px solid rgba(232,96,10,0.45)",
          boxShadow: [
            "0 4px 20px rgba(0,0,0,0.55)",
            "0 0 0 1px rgba(232,96,10,0.10)",
            "inset 0 1px 0 rgba(255,160,60,0.12)",
            "0 0 18px rgba(232,96,10,0.22)",
          ].join(", "),
          color: "#e8600a",
          transition: "all 200ms cubic-bezier(0.23,1,0.32,1)",
        }}
        title="Feedback / Support"
        onMouseEnter={e => { e.currentTarget.style.transform="scale(1.1)"; e.currentTarget.style.boxShadow="0 6px 28px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,96,10,0.20), inset 0 1px 0 rgba(255,160,60,0.16), 0 0 26px rgba(232,96,10,0.35)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,0.55), 0 0 0 1px rgba(232,96,10,0.10), inset 0 1px 0 rgba(255,160,60,0.12), 0 0 18px rgba(232,96,10,0.22)"; }}>
        <MessageSquare size={20} strokeWidth={1.5}/>
      </button>

      {/* Modal */}
      {offen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1100, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: "24px" }}>
          <div style={{ background: "rgba(25,18,8,0.96)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(240,236,227,0.12)", borderRadius: "16px", width: "100%", maxWidth: "420px", padding: "24px", boxShadow: "0 16px 48px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontWeight: 800, fontSize: "16px", color: "#f0ece3", display:"flex", alignItems:"center", gap:8 }}><MessageSquare size={16} strokeWidth={1.5}/>Feedback & Support</div>
              <button onClick={() => setOffen(false)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>

            {/* Typ-Auswahl */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
              {[["bug", AlertTriangle, "Fehler"],["idee", Zap, "Idee"],["lob", Star, "Lob"]].map(([k, Icon, l]) => (
                <button key={k} onClick={() => setTyp(k)}
                  style={{ flex: 1, padding: "7px", borderRadius: "8px", border: "2px solid " + (typ===k ? "#e8600a" : "rgba(240,236,227,0.15)"),
                    background: typ===k ? "#e8600a" : "rgba(240,236,227,0.06)", color: typ===k ? "#fff" : "rgba(240,236,227,0.7)",
                    fontWeight: 700, fontSize: "12px", cursor: "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  <Icon size={12} strokeWidth={1.5}/>{l}
                </button>
              ))}
            </div>

            <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
              placeholder={typ === "bug" ? "Was ist passiert? Wie kann ich den Fehler reproduzieren?" : typ === "idee" ? "Welche Funktion würdest du dir wünschen?" : "Was gefällt dir besonders?"}
              style={{ width: "100%", padding: "10px", border: "1.5px solid rgba(240,236,227,0.18)", borderRadius: "8px", fontSize: "13px", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", marginBottom: "10px", background: "rgba(240,236,227,0.06)", color: "#f0ece3" }} />

            {/* Datei-Upload */}
            <label style={{ display: "block", marginBottom: "14px", cursor: "pointer" }}>
              <div style={{ border: "1.5px dashed rgba(240,236,227,0.2)", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "rgba(240,236,227,0.5)", textAlign: "center" }}>
                {datei ? <span style={{display:"flex",alignItems:"center",gap:4}}><Paperclip size={12} strokeWidth={1.5}/>{datei.name}</span> : <span style={{display:"flex",alignItems:"center",gap:4,justifyContent:"center"}}><Paperclip size={12} strokeWidth={1.5}/>Screenshot / Datei anhängen (optional)</span>}
              </div>
              <input type="file" accept="image/*,.pdf,.docx" onChange={e => setDatei(e.target.files[0])} style={{ display: "none" }} />
            </label>

            {status === "ok" && <div style={{ background: "#f0fdf4", color: "#15803d", padding: "10px", borderRadius: "8px", fontWeight: 700, textAlign: "center", marginBottom: "10px", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}><CheckSquare size={14} strokeWidth={1.5}/>Danke für dein Feedback!</div>}
            {status === "err" && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px", borderRadius: "8px", fontWeight: 700, textAlign: "center", marginBottom: "10px", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}><AlertTriangle size={14} strokeWidth={1.5}/>Fehler beim Senden – bitte erneut versuchen.</div>}

            <button onClick={senden} disabled={!text.trim() || status === "sending"}
              style={{ width: "100%", padding: "12px", background: "#141008", color: "#e8600a", border: "none", borderRadius: "10px", fontWeight: 800, fontSize: "14px", cursor: text.trim() ? "pointer" : "not-allowed", opacity: text.trim() ? 1 : 0.5, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {status === "sending" ? <><Zap size={14} strokeWidth={1.5}/>Wird gesendet…</> : <><Upload size={14} strokeWidth={1.5}/>Feedback senden</>}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default SupportButton;
