// ══════════════════════════════════════════════════════════════════════════════
// EinstellungenModal – App-Einstellungen (Profil, Aufgaben, Anzeige, Export)
// Extrahiert aus BuchungsWerk.jsx – Phase C3 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React from "react";
import { User, Settings2, Eye, Download, HelpCircle, Save, AlertTriangle } from "lucide-react";
import { S } from "../../styles.js";
import { speichereSettings } from "../../settings.js";

// ── EinstellungenModal ────────────────────────────────────────────────────────
function EinstellungenModal({ settings, setSettings, onSchliessen }) {
  const [tab, setTab] = React.useState("profil");
  const [local, setLocal] = React.useState({ ...settings });

  function set(key, val) { setLocal(s => ({ ...s, [key]: val })); }
  function speichern() { setSettings(local); speichereSettings(local); onSchliessen(); }

  const tabs = [
    { id:"profil",   icon: User,       label:"Profil"    },
    { id:"aufgaben", icon: Settings2,  label:"Aufgaben"  },
    { id:"anzeige",  icon: Eye,        label:"Anzeige"   },
    { id:"export",   icon: Download,   label:"Export"    },
    { id:"hilfe",    icon: HelpCircle, label:"Hilfe"     },
  ];

  const row = (label, children) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom:"1px solid #f1f5f9" }}>
      <span style={{ fontSize:"14px", color:"#374151", fontWeight:500 }}>{label}</span>
      <div>{children}</div>
    </div>
  );
  const chk = (key, label) => (
    <label style={{ display:"flex", alignItems:"center", gap:"8px", cursor:"pointer", fontSize:"14px" }}>
      <input type="checkbox" checked={!!local[key]} onChange={e=>set(key,e.target.checked)}
        style={{ width:"18px", height:"18px", accentColor:"#0f172a", cursor:"pointer" }} />
      <span style={{ color:"#374151" }}>{label}</span>
    </label>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
      <div style={{ background:"rgba(22,16,8,0.97)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:"20px", width:"100%", maxWidth:"560px", maxHeight:"90vh", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(0,0,0,0.6)" }}>
        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#1a1208,#251a0a)", borderBottom:"2px solid #e8600a", padding:"20px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:"11px", fontWeight:700, color:"#e8600a", letterSpacing:".12em", textTransform:"uppercase", marginBottom:"4px" }}>BuchungsWerk</div>
            <div style={{ fontSize:"20px", fontWeight:900, color:"#f0ece3" }}>Einstellungen</div>
          </div>
          <button onClick={onSchliessen} style={{ background:"transparent", border:"1.5px solid rgba(240,236,227,0.2)", borderRadius:"10px", color:"rgba(240,236,227,0.5)", width:"36px", height:"36px", cursor:"pointer", fontSize:"18px" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:"2px solid rgba(240,236,227,0.1)", background:"rgba(240,236,227,0.03)" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex:1, padding:"12px 8px", border:"none", background:"transparent", cursor:"pointer", fontSize:"12px", fontWeight:tab===t.id?800:500,
                color:tab===t.id?"#f0ece3":"rgba(240,236,227,0.45)",
                borderBottom:`3px solid ${tab===t.id?"#e8600a":"transparent"}`,
                transition:"all 0.15s" }}>
              <div style={{ marginBottom:"4px", display:"flex", justifyContent:"center" }}>{React.createElement(t.icon, { size: 18, strokeWidth: 1.5 })}</div>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>

          {tab === "profil" && (
            <div>
              <div style={{ fontSize:"12px", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".1em", marginBottom:"16px" }}>Lehrkraft & Schule</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"16px" }}>
                <div>
                  <label style={{ fontSize:"11px", fontWeight:700, color:"#64748b", display:"block", marginBottom:"4px" }}>Vorname</label>
                  <input value={local.lehrerVorname} onChange={e=>set("lehrerVorname",e.target.value)}
                    placeholder="z.B. Maria" style={{ ...S.input, width:"100%", boxSizing:"border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize:"11px", fontWeight:700, color:"#64748b", display:"block", marginBottom:"4px" }}>Nachname</label>
                  <input value={local.lehrerNachname} onChange={e=>set("lehrerNachname",e.target.value)}
                    placeholder="z.B. Gruber" style={{ ...S.input, width:"100%", boxSizing:"border-box" }} />
                </div>
              </div>
              <div style={{ marginBottom:"16px" }}>
                <label style={{ fontSize:"11px", fontWeight:700, color:"#64748b", display:"block", marginBottom:"4px" }}>Stammschule</label>
                <input value={local.stammschule} onChange={e=>set("stammschule",e.target.value)}
                  placeholder="z.B. Realschule Musterstadt"
                  style={{ ...S.input, width:"100%", boxSizing:"border-box" }} />
                <div style={{ fontSize:"11px", color:"#94a3b8", marginTop:"4px" }}>→ Wird automatisch in alle Kopfzeilen bei Prüfungsexport übernommen.</div>
              </div>
              {(local.stammschule || local.lehrerVorname) && (
                <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"10px", padding:"12px 16px", fontSize:"13px", color:"#374151" }}>
                  <div style={{ fontWeight:700, marginBottom:"4px" }}>Vorschau Kopfzeile:</div>
                  <div>{local.stammschule || "Schule nicht angegeben"}</div>
                  {(local.lehrerVorname || local.lehrerNachname) && <div style={{ color:"#64748b", fontSize:"12px", marginTop:"2px" }}>Lehrkraft: {local.lehrerVorname} {local.lehrerNachname}</div>}
                </div>
              )}
            </div>
          )}

          {tab === "aufgaben" && (
            <div>
              <div style={{ fontSize:"12px", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".1em", marginBottom:"16px" }}>Aufgaben generieren</div>
              {chk("sofortrabatte", "Sofortrabatte in Eingangsrechnungen berücksichtigen")}
              <div style={{ height:1, background:"#f1f5f9", margin:"4px 0" }} />
              {chk("anschaffungsnebenkosten", "Anschaffungsnebenkosten (Bezugskosten) verwenden")}
              <div style={{ height:1, background:"#f1f5f9", margin:"4px 0" }} />
              {chk("einfacheBetraege", "Einfache (runde) Beträge bevorzugen")}
              <div style={{ marginTop:"16px", padding:"10px 14px", background:"#fffbeb", borderRadius:"10px", border:"1px solid #fde68a", fontSize:"12px", color:"#92400e", display:"flex", alignItems:"flex-start", gap:6 }}>
                <AlertTriangle size={12} strokeWidth={1.5} style={{flexShrink:0,marginTop:1}}/><span>Änderungen wirken sich auf neu generierte Aufgaben aus, nicht auf bereits erstellte.</span>
              </div>
              <div style={{ fontSize:"12px", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".1em", margin:"20px 0 12px" }}>Anrede</div>
              {chk("anredeKlasse10", 'Klasse 10: Schüler automatisch mit "Sie" ansprechen')}
            </div>
          )}

          {tab === "anzeige" && (
            <div>
              <div style={{ fontSize:"12px", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".1em", marginBottom:"16px" }}>Darstellung</div>
              {chk("kontennummernAnzeigen", "Kontennummern in Lösungen anzeigen")}
              <div style={{ height:1, background:"#f1f5f9", margin:"4px 0" }} />
              {chk("loesungenStandardAn", "Lösungen beim Öffnen standardmäßig eingeblendet")}
              <div style={{ height:1, background:"#f1f5f9", margin:"4px 0" }} />

              <div style={{ padding:"12px 0", borderBottom:"1px solid #f1f5f9" }}>
                <div style={{ fontSize:"14px", color:"#374151", fontWeight:500, marginBottom:"8px" }}>Standard-Belegmodus</div>
                <div style={{ display:"flex", gap:"8px" }}>
                  {[["beleg","Beleg"],["text","Geschäftsfall"]].map(([v,l]) => (
                    <button key={v} onClick={() => set("belegModus",v)}
                      style={{ flex:1, padding:"10px", border:`2px solid ${local.belegModus===v?"#0f172a":"#e2e8f0"}`,
                        borderRadius:"10px", background:local.belegModus===v?"#0f172a":"#fff",
                        color:local.belegModus===v?"#fff":"#64748b", fontWeight:700, fontSize:"13px", cursor:"pointer" }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding:"12px 0" }}>
                <div style={{ fontSize:"14px", color:"#374151", fontWeight:500, marginBottom:"8px" }}>Lösungsfarbe</div>
                <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                  {[["#16a34a","Grün"],["#1d4ed8","Blau"],["#dc2626","Rot"],["#7c3aed","Lila"],["#0f172a","Schwarz"]].map(([c,l]) => (
                    <button key={c} onClick={() => set("loesungsfarbe",c)}
                      style={{ padding:"7px 14px", border:`2.5px solid ${local.loesungsfarbe===c?c:"#e2e8f0"}`,
                        borderRadius:"20px", background:local.loesungsfarbe===c?c+"18":"#fff",
                        color:local.loesungsfarbe===c?c:"#64748b", fontWeight:700, fontSize:"12px", cursor:"pointer" }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "export" && (
            <div>
              <div style={{ fontSize:"12px", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".1em", marginBottom:"16px" }}>Standard-Exportformat</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"20px" }}>
                {[["word","Word / Pages","Empfohlen für iPad"],["pdf","PDF","Direkt druckbereit"]].map(([v,l,d]) => (
                  <button key={v} onClick={() => set("exportFormat",v)}
                    style={{ padding:"16px", border:`2.5px solid ${local.exportFormat===v?"#0f172a":"#e2e8f0"}`,
                      borderRadius:"14px", background:local.exportFormat===v?"#0f172a":"#fff",
                      color:local.exportFormat===v?"#fff":"#475569", cursor:"pointer", textAlign:"left" }}>
                    <div style={{ fontWeight:700, fontSize:"14px", marginBottom:"2px" }}>{l}</div>
                    <div style={{ fontSize:"11px", opacity:0.6 }}>{d}</div>
                    {local.exportFormat===v && <div style={{ marginTop:"6px", fontSize:"11px", color:"#e8600a" }}>✓ Standard</div>}
                  </button>
                ))}
              </div>
              <div style={{ fontSize:"12px", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".1em", marginBottom:"12px" }}>Über BuchungsWerk</div>
              <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"10px", padding:"14px 16px", fontSize:"13px", color:"#374151" }}>
                <div style={{ fontWeight:700, fontSize:"15px", marginBottom:"6px" }}>Buchungs<span style={{ color:"#e8600a" }}>Werk</span></div>
                <div>Version: 2026 · Bayern · Realschule BwR</div>
                <div style={{ color:"#94a3b8", fontSize:"12px", marginTop:"4px" }}>Für den Einsatz an bayerischen Realschulen im Fach BwR.</div>
                {(local.lehrerVorname || local.stammschule) && (
                  <div style={{ marginTop:"8px", paddingTop:"8px", borderTop:"1px solid #e2e8f0", color:"#64748b" }}>
                    Lizenziert für: {local.lehrerVorname} {local.lehrerNachname}{local.stammschule ? ` · ${local.stammschule}` : ""}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "hilfe" && (
            <div>
              <div style={{ fontSize:"12px", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".1em", marginBottom:"16px" }}>Häufige Fragen</div>
              {[
                { q:"Wie generiere ich Aufgaben?",
                  a:"Im ersten Schritt Klasse und Thema wählen, dann Firmenname eingeben – BuchungsWerk erstellt automatisch passende Aufgaben mit Buchungssatz und Musterlösung." },
                { q:"Was sind Eigene Belege?",
                  a:"Im Beleg-Editor kannst du eigene Rechnungen, Kontoauszüge oder Überweisungen erstellen und daraus per KI eine vollständige Buchungsaufgabe generieren lassen." },
                { q:"Wie exportiere ich eine Schulaufgabe?",
                  a:"Im Aufgaben-Schritt den Export-Button nutzen – als Word/Pages-Datei oder PDF. Das Layout entspricht dem bayerischen Schulaufgabenformat mit Punkte- und Notenfeld." },
                { q:"Was bedeuten die Punkte-Badges?",
                  a:"Jeder Buchungssatz-Block ergibt 1 Punkt. Nebenrechnungen (z.B. Skonto, Abschreibung) werden separat ausgewiesen. Die Bepunktung folgt der aktuellen Handreichung." },
                { q:"Wie funktioniert der KI-Helfer?",
                  a:"Bei eigenen Belegen kann per Knopfdruck eine vollständige Aufgabe mit Lösung und didaktischem Kommentar generiert werden. Die KI nutzt ausschließlich den bayerischen Kontenplan." },
                { q:"Was ist der Kontenplan-Button?",
                  a:"Unten in der Navigationsleiste öffnet sich der vollständige bayerische Kontenplan (IKR) mit Suche, Filteroptionen und KLR-Markierungen." },
                { q:"Wie ändere ich die Stammschule?",
                  a:"Im Tab 'Profil' dieser Einstellungen. Stammschule und Name werden automatisch in alle exportierten Schulaufgaben-Kopfzeilen übernommen." },
                { q:"Werden meine Daten gespeichert?",
                  a:"Alle Einstellungen und Belege werden lokal im Browser (localStorage) gespeichert – keine Daten auf externen Servern. Für die KI-Funktion wird nur der anonymisierte Beleg-Text übertragen." },
              ].map(({ q, a }, i) => (
                <div key={i} style={{ marginBottom:12, padding:"11px 14px", background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0" }}>
                  <div style={{ fontWeight:700, fontSize:13, color:"#0f172a", marginBottom:3 }}>❓ {q}</div>
                  <div style={{ fontSize:13, color:"#475569", lineHeight:1.6 }}>{a}</div>
                </div>
              ))}
              <div style={{ marginTop:14, padding:"11px 14px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, fontSize:12, color:"#92400e" }}>
                <strong>Probleme oder Feedback?</strong><br />Den Support-Button unten rechts verwenden – danke!
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding:"16px 24px", borderTop:"1px solid #f1f5f9", display:"flex", gap:"10px" }}>
          <button onClick={onSchliessen} style={{ flex:1, padding:"12px", background:"#f1f5f9", color:"#64748b", border:"none", borderRadius:"10px", fontWeight:700, fontSize:"14px", cursor:"pointer" }}>
            Abbrechen
          </button>
          <button onClick={speichern} style={{ flex:2, padding:"12px", background:"#0f172a", color:"#fff", border:"none", borderRadius:"10px", fontWeight:800, fontSize:"14px", cursor:"pointer",
            boxShadow:"0 4px 16px rgba(15,23,42,0.25)", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <Save size={16} strokeWidth={1.5}/>Speichern
          </button>
        </div>
      </div>
    </div>
  );
}


export default EinstellungenModal;
