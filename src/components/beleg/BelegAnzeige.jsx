// ══════════════════════════════════════════════════════════════════════════════
// Beleg-Komponenten – React-Komponenten für Belege + belegToGeschaeftsfall
// Extrahiert aus BuchungsWerk.jsx – Phase B5 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React from "react";
import { Mail, Building2 } from "lucide-react";
import { r2, fmt, fmtIBAN } from "../../utils.js";
import { S } from "../../styles.js";

// ══════════════════════════════════════════════════════════════════════════════
// BELEG-KOMPONENTEN
// ══════════════════════════════════════════════════════════════════════════════


// ── Firmen-Logo SVG Generator ──────────────────────────────
export function FirmaLogoSVG({ firma, size = 48 }) {
  const f = firma;
  const bg = f.farbe || "#0f172a";
  const initials = f.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
  const s = size, cx = s/2, cy = s/2, r = s*0.38;

  const renderShape = () => {
    if (f.id === "lumitec") {
      // Sonne: Kreis + Strahlen
      const rays = [0,45,90,135,180,225,270,315].map(deg => {
        const rad = deg * Math.PI/180;
        return <line key={deg}
          x1={cx + r*0.55*Math.cos(rad)} y1={cy + r*0.55*Math.sin(rad)}
          x2={cx + r*0.9*Math.cos(rad)}  y2={cy + r*0.9*Math.sin(rad)}
          stroke="#e8600a" strokeWidth={s*0.055} strokeLinecap="round"/>;
      });
      return <>{rays}<circle cx={cx} cy={cy} r={r*0.4} fill="#e8600a"/></>;
    }
    if (f.id === "waldform") {
      // Baum
      return <>
        <polygon points={`${cx},${cy-r} ${cx-r*0.7},${cy+r*0.45} ${cx+r*0.7},${cy+r*0.45}`} fill="#a3e635"/>
        <rect x={cx-r*0.14} y={cy+r*0.45} width={r*0.28} height={r*0.38} fill="#a3e635" opacity="0.8"/>
      </>;
    }
    if (f.id === "alpentextil") {
      // Nadel + Faden
      return <>
        <line x1={cx} y1={cy-r} x2={cx} y2={cy+r} stroke="#34d399" strokeWidth={s*0.07} strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r={r*0.28} fill="#34d399" opacity="0.85"/>
        <line x1={cx-r*0.55} y1={cy} x2={cx+r*0.55} y2={cy} stroke="#34d399" strokeWidth={s*0.04} strokeLinecap="round"/>
      </>;
    }
    if (f.id === "vitasport") {
      // Blitz
      const pts = [
        [cx+r*0.2, cy-r],[cx-r*0.35, cy+r*0.1],[cx+r*0.05, cy],
        [cx-r*0.2, cy+r],[cx+r*0.35, cy-r*0.1],[cx-r*0.05, cy]
      ].map(p => p.join(",")).join(" ");
      return <polygon points={pts} fill="#60a5fa"/>;
    }
    // Default: Initialen
    return <text x={cx} y={cy+s*0.13} textAnchor="middle"
      fontFamily="Arial,sans-serif" fontWeight="900" fontSize={s*0.34} fill="#fff">{initials}</text>;
  };

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ borderRadius: s*0.18, flexShrink: 0 }}>
      <rect width={s} height={s} rx={s*0.18} fill={bg}/>
      {renderShape()}
    </svg>
  );
}
export function BelegEingangsrechnung({ b }) {
  return (
    <div style={{ border: "1px solid #cbd5e1", borderRadius: "10px", overflow: "hidden", fontFamily: "Arial, sans-serif", fontSize: "13px", background: "#fff", color: "#374151" }}>
      {/* Header */}
      <div style={{ background: "#1e293b", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flex: 1 }}>
          {/* Lieferanten-Initial-Logo */}
          <div style={{ width: 48, height: 48, borderRadius: "10px", background: "#334155", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: "16px", fontWeight: 900, color: "#94a3b8", letterSpacing: "-0.02em" }}>
              {b.lief.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}
            </span>
          </div>
          <div style={{ color: "#fff" }}>
            <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "4px" }}>{b.lief.name}</div>
            <div style={{ color: "#cbd5e1", fontSize: "12px" }}>{b.lief.strasse} · {b.lief.plz} {b.lief.ort}</div>
            <div style={{ color: "#cbd5e1", fontSize: "12px" }}>{b.lief.tel} · {b.lief.email}</div>
            <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "2px" }}>IBAN: {fmtIBAN(b.lief.iban)}</div>
          </div>
        </div>
        <div style={{ textAlign: "right", color: "#e8600a", flexShrink: 0 }}>
          <div style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "0.1em" }}>RECHNUNG</div>
          {b.klasse7 && <div style={{ background: "#e8600a", color: "#0f172a", fontSize: "10px", fontWeight: 800, padding: "2px 8px", borderRadius: "4px", marginTop: "4px" }}>Klasse 7: Nur Bruttobetrag angegeben</div>}
        </div>
      </div>

      <div style={{ padding: "16px 18px", borderBottom: "1px solid #f1f5f9" }}>
        {/* Empfänger + Meta */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", color: "#475569", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>An</div>
            <div style={{ fontWeight: 700, color: "#1e293b" }}>{b.empfaenger.name}</div>
            <div style={{ color: "#334155" }}>{b.empfaenger.strasse}</div>
            <div style={{ color: "#334155" }}>{b.empfaenger.plz_ort}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div><span style={{ color: "#475569", fontWeight: 600 }}>Rechnungs-Nr.: </span><strong>{b.rgnr}</strong></div>
            <div><span style={{ color: "#475569", fontWeight: 600 }}>Rechnungsdatum: </span>{b.datum}</div>
            <div><span style={{ color: "#475569", fontWeight: 600 }}>Lieferdatum: </span>{b.lieferdatum}</div>
          </div>
        </div>
      </div>

      {/* Positionen */}
      <div style={{ padding: "0 18px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              <th style={{ padding: "8px 6px", textAlign: "left", color: "#334155", fontWeight: 700 }}>Pos.</th>
              <th style={{ padding: "8px 6px", textAlign: "left", color: "#334155", fontWeight: 700 }}>Bezeichnung</th>
              <th style={{ padding: "8px 6px", textAlign: "right", color: "#334155", fontWeight: 700 }}>Menge</th>
              <th style={{ padding: "8px 6px", textAlign: "right", color: "#334155", fontWeight: 700 }}>Einheit</th>
              <th style={{ padding: "8px 6px", textAlign: "right", color: "#334155", fontWeight: 700 }}>Einzelpreis</th>
              {!b.klasse7 && <th style={{ padding: "8px 6px", textAlign: "right", color: "#334155", fontWeight: 700 }}>Betrag (netto)</th>}
            </tr>
          </thead>
          <tbody>
            {b.positionen.map((p, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "8px 6px", color: "#475569" }}>{p.pos}</td>
                <td style={{ padding: "8px 6px", fontWeight: 600, color: "#1e293b" }}>{p.beschr}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: "#1e293b" }}>{p.menge != null ? p.menge.toLocaleString("de-DE") : ""}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: "#475569" }}>{p.einheit}</td>
                <td style={{ padding: "8px 6px", textAlign: "right" }}>{fmt(p.ep)} €</td>
                {!b.klasse7 && <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 600 }}>{fmt(p.netto)} €</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summen */}
      <div style={{ padding: "12px 18px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
        <table style={{ fontSize: "13px", minWidth: "260px" }}>
          <tbody>
            {b.klasse7 ? (
              <tr style={{ background: "#1e293b", color: "#fff" }}>
                <td style={{ padding: "10px 12px", fontWeight: 700 }}>Rechnungsbetrag (brutto)</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontSize: "16px" }}>{fmt(b.brutto)} €</td>
              </tr>
            ) : (<>
              <tr><td style={{ padding: "4px 12px", color: "#64748b" }}>Nettobetrag</td><td style={{ padding: "4px 12px", textAlign: "right", color: "#374151" }}>{fmt(b.netto)} €</td></tr>
              <tr><td style={{ padding: "4px 12px", color: "#64748b" }}>zzgl. {b.ustPct} % MwSt.</td><td style={{ padding: "4px 12px", textAlign: "right", color: "#374151" }}>{fmt(b.ustBetrag)} €</td></tr>
              <tr style={{ background: "#1e293b", color: "#fff" }}>
                <td style={{ padding: "8px 12px", fontWeight: 700 }}>Rechnungsbetrag</td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 800, fontSize: "15px" }}>{fmt(b.brutto)} €</td>
              </tr>
            </>)}
          </tbody>
        </table>
      </div>

      {/* Zahlungsbedingungen */}
      <div style={{ padding: "10px 18px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", fontSize: "12px", color: "#475569" }}>
        <strong>Zahlungsbedingungen:</strong> {b.zahlungsziel}
      </div>
    </div>
  );
}

export function BelegAusgangsrechnung({ b }) {
  return (
    <div style={{ border: "1px solid #cbd5e1", borderRadius: "10px", overflow: "hidden", fontFamily: "Arial, sans-serif", fontSize: "13px", background: "#fff", color: "#374151" }}>
      <div style={{ background: b.firma.farbe, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flex: 1 }}>
          <FirmaLogoSVG firma={b.firma} size={52} />
          <div style={{ color: "#fff" }}>
            <div style={{ fontWeight: 900, fontSize: "17px", marginBottom: "3px", letterSpacing: "-0.01em" }}>{b.firma.name}</div>
            <div style={{ opacity: 0.85, fontSize: "12px" }}>{b.firma.strasse} · {b.firma.plz} {b.firma.ort}</div>
            <div style={{ opacity: 0.7, fontSize: "11px" }}>{b.firma.email} · IBAN: {fmtIBAN(b.firma.iban)}</div>
            <div style={{ marginTop: "4px", fontSize: "10px", color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em" }}>{b.firma.slogan || ""}</div>
          </div>
        </div>
        <div style={{ textAlign: "right", color: "#fff", flexShrink: 0 }}>
          <div style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "0.1em", opacity: 0.9 }}>RECHNUNG</div>
        </div>
      </div>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "4px" }}>An</div>
            <div style={{ fontWeight: 700, color: "#1e293b" }}>{b.kunde.name}</div>
            <div style={{ color: "#64748b" }}>{b.kunde.strasse}</div>
            <div style={{ color: "#64748b" }}>{b.kunde.plz} {b.kunde.ort}</div>
            <div style={{ color: "#64748b", fontSize: "12px" }}>Kunden-Nr.: {b.kunde.kundennr}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div><span style={{ color: "#94a3b8" }}>Rechnungs-Nr.: </span><strong>{b.rgnr}</strong></div>
            <div><span style={{ color: "#94a3b8" }}>Datum: </span>{b.datum}</div>
            <div><span style={{ color: "#94a3b8" }}>Lieferdatum: </span>{b.lieferdatum}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "0 18px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              {["Pos.", "Bezeichnung", "Menge", "Einheit", "Einzelpreis", "Betrag (netto)"].map((h, i) => (
                <th key={i} style={{ padding: "8px 6px", textAlign: i > 1 ? "right" : "left", color: "#64748b" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.positionen.map((p, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "8px 6px", color: "#64748b" }}>{p.pos}</td>
                <td style={{ padding: "8px 6px", fontWeight: 500 }}>{p.beschr}</td>
                <td style={{ padding: "8px 6px", textAlign: "right" }}>{p.menge}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: "#64748b" }}>{p.einheit}</td>
                <td style={{ padding: "8px 6px", textAlign: "right" }}>{fmt(p.ep)} €</td>
                <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 600 }}>{fmt(p.netto)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: "12px 18px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
        <table style={{ fontSize: "13px", minWidth: "260px" }}>
          <tbody>
            <tr><td style={{ padding: "4px 12px", color: "#64748b" }}>Nettobetrag</td><td style={{ padding: "4px 12px", textAlign: "right", color: "#374151" }}>{fmt(b.netto)} €</td></tr>
            <tr><td style={{ padding: "4px 12px", color: "#64748b" }}>zzgl. {b.ustPct} % MwSt.</td><td style={{ padding: "4px 12px", textAlign: "right", color: "#374151" }}>{fmt(b.ustBetrag)} €</td></tr>
            <tr style={{ background: b.firma.farbe + "22", borderTop: "2px solid " + b.firma.farbe }}>
              <td style={{ padding: "8px 12px", fontWeight: 700, color: b.firma.farbe }}>Rechnungsbetrag</td>
              <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 800, fontSize: "15px", color: b.firma.farbe }}>{fmt(b.brutto)} €</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ padding: "10px 18px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", fontSize: "12px", color: "#475569" }}>
        <strong>Zahlungsbedingungen:</strong> {b.zahlungsziel}
      </div>
    </div>
  );
}

export function BelegKontoauszug({ b }) {
  return (
    <div style={{ border: "1px solid #bfdbfe", borderRadius: "10px", overflow: "hidden", fontFamily: "Arial, sans-serif", fontSize: "13px", background: "#fff" }}>
      <div style={{ background: "#1e40af", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "15px", display:"flex", alignItems:"center", gap:6 }}><Building2 size={14} strokeWidth={1.5}/>{b.bank}</div>
          <div style={{ color: "#93c5fd", fontSize: "12px" }}>Kontoauszug Nr. {b.auszugNr}</div>
        </div>
        <div style={S.right}>
          <div style={{ color: "#fff", fontWeight: 600 }}>{b.kontoinhaber}</div>
          <div style={{ color: "#93c5fd", fontSize: "11px" }}>{fmtIBAN(b.iban)}</div>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: "#eff6ff" }}>
            <th style={{ padding: "8px 14px", textAlign: "left", color: "#1e40af", fontWeight: 700, borderBottom: "2px solid #bfdbfe" }}>Datum</th>
            <th style={{ padding: "8px 14px", textAlign: "left", color: "#1e40af", fontWeight: 700, borderBottom: "2px solid #bfdbfe" }}>Buchungstext</th>
            <th style={{ padding: "8px 14px", textAlign: "right", color: "#1e40af", fontWeight: 700, borderBottom: "2px solid #bfdbfe" }}>Betrag</th>
          </tr>
        </thead>
        <tbody>
          {b.buchungen.map((buch, i) => (
            <tr key={i} style={{
              background: buch.highlight ? "#fef9c3" : i % 2 === 0 ? "#fff" : "#f8fafc",
              borderLeft: buch.highlight ? "4px solid #e8600a" : "4px solid transparent",
              borderBottom: "1px solid rgba(240,236,227,0.1)",
            }}>
              <td style={{ padding: "9px 14px", color: "#64748b", whiteSpace: "nowrap" }}>{buch.datum}</td>
              <td style={{ padding: "9px 14px", color: "#374151" }}>
                {buch.text}
                {buch.highlight && <span style={{ marginLeft: "8px", fontSize: "10px", background: "#e8600a", color: "#0f172a", fontWeight: 800, padding: "1px 6px", borderRadius: "10px" }}>◀ zu buchen</span>}
              </td>
              <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 700, fontFamily: "monospace", color: buch.betrag > 0 ? "#15803d" : "#dc2626" }}>
                {buch.betrag > 0 ? "+" : ""}{fmt(Math.abs(buch.betrag))} €
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BelegUeberweisung({ b }) {
  return (
    <div style={{ border: "1px solid #bbf7d0", borderRadius: "10px", overflow: "hidden", fontFamily: "Arial, sans-serif", fontSize: "13px", background: "#fff" }}>
      <div style={{ background: "#15803d", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "15px" }}>💻 {b.bank}</div>
          <div style={{ color: "#86efac", fontSize: "12px" }}>Online-Überweisung</div>
        </div>
        <div style={{ background: "#16a34a", border: "1px solid #4ade80", borderRadius: "8px", padding: "5px 14px", color: "#fff", fontWeight: 700, fontSize: "13px" }}>
          ✓ Ausgeführt am {b.ausfuehrungsdatum}
        </div>
      </div>
      <div style={{ padding: "16px 20px", background: "#f0fdf4" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "14px" }}>
          <div style={{ padding: "12px 14px", background: "#fff", borderRadius: "8px", border: "1px solid #d1fae5" }}>
            <div style={{ fontSize: "10px", color: "#16a34a", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>Auftraggeber</div>
            <div style={{ fontWeight: 700, color: "#0f172a" }}>{b.absender.name}</div>
            <div style={{ fontSize: "12px", color: "#64748b", fontFamily: "monospace" }}>{fmtIBAN(b.absender.iban)}</div>
          </div>
          <div style={{ padding: "12px 14px", background: "#fff", borderRadius: "8px", border: "1px solid #d1fae5" }}>
            <div style={{ fontSize: "10px", color: "#16a34a", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>Empfänger</div>
            <div style={{ fontWeight: 700, color: "#0f172a" }}>{b.empfaenger.name}</div>
            <div style={{ fontSize: "12px", color: "#64748b", fontFamily: "monospace" }}>{fmtIBAN(b.empfaenger.iban)}</div>
          </div>
        </div>
        <div style={{ padding: "12px 14px", background: "#fff", borderRadius: "8px", border: "1px solid #d1fae5" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <div style={{ fontSize: "10px", color: "#16a34a", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>Verwendungszweck</div>
              <div style={{ color: "#374151" }}>{b.verwendungszweck}</div>
            </div>
            <div style={S.right}>
              <div style={{ fontSize: "10px", color: "#16a34a", fontWeight: 700, textTransform: "uppercase", marginBottom: "2px" }}>Überweisungsbetrag</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#dc2626" }}>−{fmt(b.betrag)} €</div>
              {b.skontoBetrag > 0 && (
                <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: 700 }}>
                  (Bruttorechnung − {fmt(b.skontoBetrag)} € Skonto)
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BelegEmail({ b }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", fontFamily: "Arial, sans-serif", fontSize: "13px", background: "#fff" }}>
      <div style={{ background: "#374151", padding: "10px 16px" }}>
        <div style={{ color: "#9ca3af", fontSize: "11px", marginBottom: "2px" }}>📧 E-Mail</div>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px" }}>{b.betreff}</div>
      </div>
      <div style={{ background: "#f9fafb", padding: "10px 16px", borderBottom: "1px solid #e2e8f0", fontSize: "12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: "8px", rowGap: "3px" }}>
          <span style={{ color: "#374151", fontWeight: 700 }}>Von:</span> <span style={{ color: "#1e293b" }}><strong>{b.vonName}</strong> &lt;{b.von}&gt;</span>
          <span style={{ color: "#374151", fontWeight: 700 }}>An:</span> <span style={{ color: "#1e293b" }}>{b.an}</span>
          <span style={{ color: "#374151", fontWeight: 700 }}>Datum:</span> <span style={{ color: "#1e293b" }}>{b.datum}, {b.uhrzeit}</span>
        </div>
      </div>
      <div style={{ padding: "14px 16px", whiteSpace: "pre-wrap", lineHeight: 1.65, color: "#1e293b", background: "#fff" }}>
        {b.text}
      </div>
    </div>
  );
}

export function BelegAnzeige({ beleg }) {
  if (!beleg) return null;
  if (beleg.typ === "eingangsrechnung" || beleg.typ === "eingangsrechnung_fehler") return <BelegEingangsrechnung b={beleg} />;
  if (beleg.typ === "ausgangsrechnung") return <BelegAusgangsrechnung b={beleg} />;
  if (beleg.typ === "kontoauszug")      return <BelegKontoauszug b={beleg} />;
  if (beleg.typ === "ueberweisung")     return <BelegUeberweisung b={beleg} />;
  if (beleg.typ === "email")            return <BelegEmail b={beleg} />;
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// AUFGABE-KARTE
// ══════════════════════════════════════════════════════════════════════════════
// ──────────────────────────────────────────────────────────────────────────────
// BELEG → GESCHÄFTSFALL-TEXT (automatische Ableitung)
// ──────────────────────────────────────────────────────────────────────────────
export function belegToGeschaeftsfall(beleg) {
  if (!beleg) return null;
  switch (beleg.typ) {
    case "eingangsrechnung_fehler":
    case "eingangsrechnung": {
      const pos = (beleg.positionen||[]).find(p => !p.isRabatt) || {};
      if (!pos.menge) return null;
      if (beleg.klasse7) {
        return `${beleg.empfaenger.name} kauft ${pos.menge.toLocaleString("de-DE")} ${pos.einheit} ${pos.beschr} beim Lieferanten ${beleg.lief.name}, ${beleg.lief.ort}, zum Rechnungsbetrag (brutto) von ${fmt(beleg.brutto)} € auf Ziel (USt-Satz 19 %).`;
      }
      const extra = beleg.positionen.filter(p => !p.isRabatt).length > 1
        ? ` Zusätzlich werden ${beleg.positionen.filter(p => !p.isRabatt)[1].beschr} von ${fmt(beleg.positionen.filter(p => !p.isRabatt)[1].netto)} € netto in Rechnung gestellt (ebenfalls auf Ziel).`
        : "";
      return `${beleg.empfaenger.name} kauft ${pos.menge.toLocaleString("de-DE")} ${pos.einheit} ${pos.beschr} beim Lieferanten ${beleg.lief.name}, ${beleg.lief.ort}, zum Nettobetrag von ${fmt(pos.netto)} € (zzgl. ${beleg.ustPct} % USt ${fmt(beleg.ustBetrag)} €; Brutto: ${fmt(beleg.brutto)} €) auf Ziel.${extra}`;
    }
    case "ausgangsrechnung": {
      const pos = (beleg.positionen||[]).find(p => !p.isRabatt) || beleg.positionen[0] || {};
      const skonto = (beleg.zahlungsziel||"").includes("Skonto") ? ` Zahlungsbedingung: ${beleg.zahlungsziel.split("|")[0].trim()}.` : "";
      return `${beleg.firma.name}, ${beleg.firma.ort}, verkauft ${pos.menge} ${pos.einheit} ${pos.beschr} an ${beleg.kunde.name}, ${beleg.kunde.ort} (Kd.-Nr. ${beleg.kunde.kundennr}), zum Nettopreis von ${fmt(pos.netto)} € (zzgl. ${beleg.ustPct} % USt ${fmt(beleg.ustBetrag)} €; Brutto: ${fmt(beleg.brutto)} €) auf Ziel.${skonto}`;
    }
    case "ueberweisung": {
      const skontoHinweis = beleg.skontoBetrag > 0
        ? ` (Rechnungsbetrag brutto: ${fmt(r2(beleg.betrag + beleg.skontoBetrag))} €, abzgl. Skonto: ${fmt(beleg.skontoBetrag)} €)`
        : "";
      return `${beleg.absender.name} überweist ${fmt(beleg.betrag)} € an ${beleg.empfaenger.name}${skontoHinweis}. Verwendungszweck: "${beleg.verwendungszweck}" (Ausführungsdatum: ${beleg.ausfuehrungsdatum}).`;
    }
    case "kontoauszug": {
      const hl = beleg.buchungen.find(b => b.highlight);
      if (!hl) return "Bankbuchung laut Kontoauszug.";
      const richtung = hl.betrag > 0 ? "eingehend" : "ausgehend";
      return `Laut Kontoauszug der ${beleg.kontoinhaber} (${beleg.bank}) ist am ${hl.datum} ein Betrag von ${fmt(Math.abs(hl.betrag))} € ${richtung}. Buchungstext: "${hl.text}".`;
    }
    case "email": {
      return `Am ${beleg.datum} erhält die Buchhaltung eine E-Mail von ${beleg.vonName} (${beleg.von}) mit dem Betreff: "${beleg.betreff}". Entnehmen Sie der E-Mail den buchungsrelevanten Sachverhalt.`;
    }
    default: return null;
  }
}
