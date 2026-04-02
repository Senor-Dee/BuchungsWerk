// ══════════════════════════════════════════════════════════════════════════════
// DisclaimerModal – Qualitätssicherungs-Hinweis beim App-Start
// ══════════════════════════════════════════════════════════════════════════════
import React from "react";

function DisclaimerModal({ onSchliessen }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"rgba(22,16,8,0.97)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:18, maxWidth:480, width:"100%", boxShadow:"0 24px 64px rgba(0,0,0,0.6)", overflow:"hidden" }}>
        <div style={{ background:"linear-gradient(135deg,#1a1208,#251a0a)", borderBottom:"2px solid #e8600a", padding:"20px 24px", display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:28 }}>📋</span>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"#e8600a", letterSpacing:".12em", textTransform:"uppercase" }}>Buchungs<span style={{color:"#fff"}}>Werk</span></div>
            <div style={{ fontSize:17, fontWeight:900, color:"#fff", marginTop:2 }}>Hinweis zur Qualitätssicherung</div>
          </div>
        </div>
        <div style={{ padding:"20px 24px" }}>
          <p style={{ fontSize:14, lineHeight:1.7, color:"rgba(240,236,227,0.8)", margin:"0 0 14px" }}>
            Alle Aufgaben und Musterlösungen in dieser App werden auf Basis der aktuell geltenden Handreichung und des bayerischen Lehrplans für das Fach BwR an Realschulen erstellt.
          </p>
          <p style={{ fontSize:14, lineHeight:1.7, color:"rgba(240,236,227,0.8)", margin:"0 0 16px" }}>
            Trotz sorgfältiger Konzeption können sich <strong>inhaltliche oder didaktische Fehler</strong> einschleichen. Bitte alle Aufgaben und Lösungen <strong>vor der Ausgabe an Schülerinnen und Schüler gegenchecken</strong>.
          </p>
          <div style={{ background:"rgba(232,96,10,0.12)", border:"1px solid rgba(232,96,10,0.3)", borderRadius:10, padding:"10px 14px", fontSize:12, color:"#f0c090", marginBottom:20 }}>
            💡 Bei Auffälligkeiten gerne Feedback über den Support-Button senden – danke!
          </div>
          <button onClick={onSchliessen}
            style={{ width:"100%", padding:"13px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:800, fontSize:15, cursor:"pointer", boxShadow:"0 4px 16px rgba(232,96,10,0.3)" }}>
            ✓ Verstanden – App öffnen
          </button>
        </div>
      </div>
    </div>
  );
}

export default DisclaimerModal;
