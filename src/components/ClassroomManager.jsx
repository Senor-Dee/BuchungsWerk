// ══════════════════════════════════════════════════════════════════════════════
// ClassroomManager – Klassen & Schüler verwalten
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, Users, UserPlus, Loader } from "lucide-react";
import { useKlassen } from "../hooks/useKlassen.js";

const BLUE  = "#3b82f6";
const BLUE2 = "rgba(59,130,246,0.12)";

const iStyle = {
  padding: "8px 12px", borderRadius: 8, fontSize: 13, fontFamily: "inherit",
  background: "rgba(240,246,252,0.06)", border: "1px solid rgba(240,246,252,0.12)",
  color: "#f0f6fc", outline: "none", width: "100%", boxSizing: "border-box",
};
const btnBlue = {
  padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
  background: BLUE, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
  display: "flex", alignItems: "center", gap: 5,
};
const btnGhost = {
  padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(240,246,252,0.12)",
  background: "none", color: "rgba(240,246,252,0.5)", cursor: "pointer",
  fontSize: 12, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
};

export default function ClassroomManager() {
  const {
    klassen, schuelerMap, loading, error,
    ladeSchueler, klasseAnlegen, klasseEntfernen,
    schuelerAnlegen, schuelerEntfernen,
  } = useKlassen();

  const [offeneKlasse, setOffeneKlasse] = useState(null);

  // Neue Klasse
  const [neuName,     setNeuName]     = useState("");
  const [neuStufe,    setNeuStufe]    = useState("7");
  const [neuSchuljahr,setNeuSchuljahr]= useState("2025/26");
  const [neuKlasseOffen, setNeuKlasseOffen] = useState(false);

  // Neuer Schüler
  const [neuVorname,  setNeuVorname]  = useState("");
  const [neuNachname, setNeuNachname] = useState("");
  const [neuKuerzel,  setNeuKuerzel]  = useState("");
  const [schuelerFormKlasse, setSchuelerFormKlasse] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  async function openKlasse(id) {
    setOffeneKlasse(id);
    if (!schuelerMap[id]) await ladeSchueler(id);
  }

  async function handleKlasseAnlegen(e) {
    e.preventDefault(); setSaving(true); setSaveErr("");
    try {
      await klasseAnlegen(neuName.trim(), parseInt(neuStufe), neuSchuljahr.trim());
      setNeuName(""); setNeuKlasseOffen(false);
    } catch (err) { setSaveErr(err.message); }
    finally { setSaving(false); }
  }

  async function handleSchuelerAnlegen(e, klasseId) {
    e.preventDefault(); setSaving(true); setSaveErr("");
    try {
      await schuelerAnlegen(klasseId, neuVorname.trim(), neuNachname.trim(), neuKuerzel.trim());
      setNeuVorname(""); setNeuNachname(""); setNeuKuerzel(""); setSchuelerFormKlasse(null);
    } catch (err) { setSaveErr(err.message); }
    finally { setSaving(false); }
  }

  if (loading && klassen.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
        gap: 10, padding: 48, color: "rgba(240,246,252,0.4)" }}>
        <Loader size={18} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }}/>
        Klassen werden geladen…
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#f0f6fc", margin: 0 }}>
          Meine Klassen
        </h2>
        <button style={btnBlue} onClick={() => setNeuKlasseOffen(v => !v)}>
          <Plus size={14} strokeWidth={2} /> Neue Klasse
        </button>
      </div>

      {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
        borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {/* Neue Klasse Form */}
      {neuKlasseOffen && (
        <form onSubmit={handleKlasseAnlegen}
          style={{ background: "rgba(59,130,246,0.08)", border: `1px solid ${BLUE2}`,
            borderRadius: 12, padding: 16, marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 10 }}>
          <input style={{ ...iStyle, flex: "1 1 160px" }} placeholder="Klassenname z.B. 8c"
            value={neuName} onChange={e => setNeuName(e.target.value)} required />
          <select style={{ ...iStyle, flex: "0 0 100px" }} value={neuStufe} onChange={e => setNeuStufe(e.target.value)}>
            {[7,8,9,10].map(s => <option key={s} value={s}>Klasse {s}</option>)}
          </select>
          <input style={{ ...iStyle, flex: "1 1 110px" }} placeholder="Schuljahr 2025/26"
            value={neuSchuljahr} onChange={e => setNeuSchuljahr(e.target.value)} required />
          <button type="submit" style={btnBlue} disabled={saving}>
            {saving ? <Loader size={13} strokeWidth={2}/> : <Plus size={13} strokeWidth={2}/>} Anlegen
          </button>
          {saveErr && <p style={{ color: "#f87171", fontSize: 12, width: "100%", margin: 0 }}>{saveErr}</p>}
        </form>
      )}

      {/* Klassen-Liste */}
      {klassen.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(240,246,252,0.3)", fontSize: 14 }}>
          Noch keine Klassen angelegt.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {klassen.map(k => {
            const isOpen = offeneKlasse === k.id;
            const schueler = schuelerMap[k.id] || [];
            return (
              <div key={k.id} style={{ background: "rgba(240,246,252,0.04)",
                border: "1px solid rgba(240,246,252,0.1)", borderRadius: 12, overflow: "hidden" }}>

                {/* Klassen-Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                  cursor: "pointer", userSelect: "none" }} onClick={() => isOpen ? setOffeneKlasse(null) : openKlasse(k.id)}>
                  {isOpen ? <ChevronDown size={16} color={BLUE} strokeWidth={2}/>
                           : <ChevronRight size={16} color="rgba(240,246,252,0.3)" strokeWidth={2}/>}
                  <Users size={15} color={BLUE} strokeWidth={1.8}/>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#f0f6fc", flex: 1 }}>
                    {k.name}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(240,246,252,0.35)" }}>
                    Klasse {k.stufe} · {k.schuljahr}
                  </span>
                  <button onClick={e => { e.stopPropagation(); if (confirm(`Klasse "${k.name}" löschen?`)) klasseEntfernen(k.id); }}
                    style={{ ...btnGhost, color: "#f87171", borderColor: "rgba(248,113,113,0.2)", marginLeft: 4 }}>
                    <Trash2 size={12} strokeWidth={2}/>
                  </button>
                </div>

                {/* Schüler-Liste */}
                {isOpen && (
                  <div style={{ borderTop: "1px solid rgba(240,246,252,0.07)", padding: "12px 16px" }}>
                    {schueler.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                        {schueler.map(s => (
                          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8,
                            padding: "6px 10px", background: "rgba(240,246,252,0.03)",
                            borderRadius: 7, border: "1px solid rgba(240,246,252,0.06)" }}>
                            <span style={{ fontSize: 13, color: "#f0f6fc", flex: 1 }}>
                              {s.nachname}, {s.vorname}
                              {s.kuerzel && <span style={{ color: "rgba(240,246,252,0.35)", marginLeft: 6 }}>({s.kuerzel})</span>}
                            </span>
                            <button onClick={() => { if (confirm(`${s.vorname} ${s.nachname} löschen?`)) schuelerEntfernen(k.id, s.id); }}
                              style={{ ...btnGhost, padding: "3px 7px" }}>
                              <Trash2 size={11} strokeWidth={2}/>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: "rgba(240,246,252,0.3)", margin: "0 0 12px" }}>
                        Noch keine Schüler in dieser Klasse.
                      </p>
                    )}

                    {/* Neuer Schüler */}
                    {schuelerFormKlasse === k.id ? (
                      <form onSubmit={e => handleSchuelerAnlegen(e, k.id)}
                        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <input style={{ ...iStyle, flex: "1 1 120px" }} placeholder="Vorname"
                          value={neuVorname} onChange={e => setNeuVorname(e.target.value)} required autoFocus/>
                        <input style={{ ...iStyle, flex: "1 1 120px" }} placeholder="Nachname"
                          value={neuNachname} onChange={e => setNeuNachname(e.target.value)} required/>
                        <input style={{ ...iStyle, flex: "0 0 80px" }} placeholder="Kürzel"
                          value={neuKuerzel} onChange={e => setNeuKuerzel(e.target.value)} maxLength={6}/>
                        <button type="submit" style={btnBlue} disabled={saving}>
                          {saving ? <Loader size={13}/> : <Plus size={13}/>} Hinzufügen
                        </button>
                        <button type="button" style={btnGhost} onClick={() => setSchuelerFormKlasse(null)}>Abbrechen</button>
                        {saveErr && <p style={{ color:"#f87171", fontSize:12, width:"100%", margin:0 }}>{saveErr}</p>}
                      </form>
                    ) : (
                      <button style={btnGhost} onClick={() => { setSchuelerFormKlasse(k.id); setSaveErr(""); }}>
                        <UserPlus size={13} strokeWidth={2}/> Schüler hinzufügen
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
