// ══════════════════════════════════════════════════════════════════════════════
// StripeReturn – Seite nach Stripe Checkout Redirect
// URL: /payment/stripe/return?session_id=cs_...
// ══════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";

export default function StripeReturn() {
  const [status,  setStatus]  = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (!sessionId) {
      setStatus("error");
      setMessage("Keine Session-ID erhalten. Bitte versuche es erneut.");
      return;
    }

    // Stripe-Aktivierung läuft via Webhook — wir pollen kurz den Abo-Status
    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const res = await apiFetch("/payment/subscription/status", "GET", null, 10000, true);
        if (res?.has_subscription && res?.status === "active") {
          // localStorage aktualisieren
          try {
            const stored = JSON.parse(localStorage.getItem("bw_user") || "null");
            if (stored) {
              stored.lizenz_typ = "pro";
              stored.lizenz_bis = res.current_period_end;
              localStorage.setItem("bw_user", JSON.stringify(stored));
            }
          } catch {}
          setStatus("success");
          setMessage("Dein Pro-Abo ist jetzt aktiv!");
          setTimeout(() => { window.location.href = "/buchungswerk"; }, 2500);
          return;
        }
      } catch {}
      if (attempts < 8) {
        setTimeout(poll, 1500); // Webhook braucht kurz
      } else {
        // Timeout — trotzdem Success zeigen (Webhook kommt nach)
        setStatus("success");
        setMessage("Zahlung eingegangen! Dein Konto wird gleich aktiviert.");
        setTimeout(() => { window.location.href = "/buchungswerk"; }, 3000);
      }
    };
    setTimeout(poll, 1000); // 1s warten damit Webhook ankommen kann
  }, []);

  const iconBase = {
    width: 64, height: 64, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 20px", fontSize: 28,
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#141008",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <div style={{ textAlign: "center", padding: "40px 24px", maxWidth: 440 }}>

        {status === "loading" && (
          <>
            <div style={{
              width: 48, height: 48,
              border: "4px solid rgba(232,96,10,0.25)",
              borderTopColor: "#e8600a",
              borderRadius: "50%",
              margin: "0 auto 20px",
              animation: "spin 0.9s linear infinite",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: "#f0ece3", fontSize: 15 }}>Abo wird aktiviert …</p>
            <p style={{ color: "rgba(240,236,227,0.45)", fontSize: 13, marginTop: 8 }}>
              Einen Moment bitte
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ ...iconBase, background: "rgba(232,96,10,0.15)", border: "2px solid #e8600a" }}>
              ✓
            </div>
            <h2 style={{ color: "#f0ece3", fontWeight: 700, marginBottom: 8 }}>Glückwunsch!</h2>
            <p style={{ color: "rgba(240,236,227,0.7)", fontSize: 15, marginBottom: 20 }}>{message}</p>
            <p style={{ color: "rgba(240,236,227,0.45)", fontSize: 13 }}>
              Du wirst gleich weitergeleitet …
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ ...iconBase, background: "rgba(200,50,50,0.15)", border: "2px solid rgba(200,50,50,0.6)", color: "#e05555" }}>
              ✕
            </div>
            <h2 style={{ color: "#f0ece3", fontWeight: 700, marginBottom: 8 }}>
              Aktivierung fehlgeschlagen
            </h2>
            <p style={{ color: "rgba(240,236,227,0.7)", fontSize: 15, marginBottom: 24 }}>
              {message}
            </p>
            <button
              onClick={() => { window.location.href = "/buchungswerk"; }}
              style={{
                padding: "12px 28px",
                background: "linear-gradient(180deg,#f07320,#e8600a 55%,#c24f08)",
                border: "none", borderRadius: "10px",
                color: "#fff", fontWeight: 700, fontSize: 15,
                cursor: "pointer",
              }}
            >
              Zurück zur App
            </button>
          </>
        )}
      </div>
    </div>
  );
}
