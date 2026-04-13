// ══════════════════════════════════════════════════════════════════════════════
// LizenzGate – Paywall für Klasse 8–10 (nur Pro-User)
// Usage: <LizenzGate klasse={8}><Content /></LizenzGate>
// ══════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { PaymentButton } from "./payment/PaymentButton.jsx";

// TODO: Beta-Flag – alle Klassenstufen für Free-User freigegeben (fachliche Tests)
// Auf false setzen sobald Beta abgeschlossen und Monetarisierung aktiv
const BETA_ALLE_KLASSEN_FREI = true;

export function LizenzGate({ klasse, children, onLocked, onBack }) {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState(null); // null = prüfe noch

  useEffect(() => {
    if (!user) { setAllowed(false); onLocked?.(); return; }
    if (BETA_ALLE_KLASSEN_FREI)        { setAllowed(true); return; }
    if (user.lizenz_typ === "schule") { setAllowed(true); return; }
    if (!klasse || klasse <= 7)       { setAllowed(true); return; }
    if (user.lizenz_typ === "pro" && user.lizenz_bis) {
      const ok = new Date() < new Date(user.lizenz_bis);
      setAllowed(ok);
      if (!ok) onLocked?.();
      return;
    }
    setAllowed(false);
    onLocked?.();
  }, [user, klasse]); // eslint-disable-line react-hooks/exhaustive-deps

  if (allowed === null) return null; // kurzer Moment während Prüfung
  if (allowed)         return children;

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.65)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1800, padding: "16px",
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <div style={{
        background: "rgba(18,12,5,0.98)",
        border: "1px solid rgba(232,96,10,0.3)",
        borderTop: "2px solid #e8600a",
        borderRadius: "18px",
        padding: "36px 32px",
        maxWidth: 400, width: "100%",
        textAlign: "center",
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "rgba(232,96,10,0.12)",
          border: "1px solid rgba(232,96,10,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
        }}>
          <Lock size={24} color="#e8600a" />
        </div>

        <h2 style={{ color: "#f0ece3", fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
          Pro-Lizenz erforderlich
        </h2>
        <p style={{ color: "rgba(240,236,227,0.65)", fontSize: 14, lineHeight: 1.5, marginBottom: 8 }}>
          Klasse {klasse} ist in der <strong style={{ color: "#f0ece3" }}>Pro-Version</strong> verfügbar.
        </p>
        <p style={{ color: "#e8600a", fontWeight: 700, fontSize: 18, marginBottom: 24 }}>
          4,99 €/Monat
        </p>

        <PaymentButton
          onError={msg => alert(msg)}
        />

        <button
          onClick={() => onBack ? onBack() : window.history.back()}
          style={{
            marginTop: 12,
            padding: "10px 24px",
            background: "rgba(240,236,227,0.07)",
            border: "1px solid rgba(240,236,227,0.15)",
            borderRadius: "10px",
            color: "rgba(240,236,227,0.65)",
            fontWeight: 600, fontSize: 14,
            cursor: "pointer", width: "100%",
          }}
        >
          Zurück
        </button>
      </div>
    </div>
  );
}
