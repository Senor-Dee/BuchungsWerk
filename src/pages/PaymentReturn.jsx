// ══════════════════════════════════════════════════════════════════════════════
// PaymentReturn – Seite nach PayPal-Redirect
// URL: /payment/return?token=EC-...&PayerID=...
// ══════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";

export default function PaymentReturn() {
  const [status,  setStatus]  = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    // PayPal sendet ?token=EC-XXXX als Order-ID zurück
    const params  = new URLSearchParams(window.location.search);
    const orderId = params.get("token") || params.get("orderId");

    if (!orderId) {
      setStatus("error");
      setMessage("Keine Order-ID erhalten. Bitte versuche es erneut.");
      return;
    }

    apiFetch("/payment/verify-order", "POST", { order_id: orderId }, 30000, true)
      .then(res => {
        if (res?.success) {
          setStatus("success");
          setMessage("Deine Pro-Lizenz ist jetzt aktiv!");
          // User-Objekt in localStorage aktualisieren (lizenz_typ)
          try {
            const stored = JSON.parse(localStorage.getItem("bw_user") || "null");
            if (stored) {
              stored.lizenz_typ = "pro";
              stored.lizenz_bis = res.lizenz_bis;
              localStorage.setItem("bw_user", JSON.stringify(stored));
            }
          } catch {}
          setTimeout(() => { window.location.href = "/buchungswerk"; }, 2500);
        } else {
          setStatus("error");
          setMessage(res?.message || "Zahlung konnte nicht verarbeitet werden.");
        }
      })
      .catch(e => {
        setStatus("error");
        setMessage(e.message || "Fehler beim Verifizieren der Zahlung.");
      });
  }, []);

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
              width: 48, height: 48, border: "4px solid rgba(232,96,10,0.25)",
              borderTopColor: "#e8600a", borderRadius: "50%",
              margin: "0 auto 20px",
              animation: "spin 0.9s linear infinite",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: "#f0ece3", fontSize: 15 }}>Zahlung wird bestätigt …</p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(232,96,10,0.15)",
              border: "2px solid #e8600a",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: 28,
            }}>✓</div>
            <h2 style={{ color: "#f0ece3", fontWeight: 700, marginBottom: 8 }}>Glückwunsch!</h2>
            <p style={{ color: "rgba(240,236,227,0.7)", fontSize: 15, marginBottom: 20 }}>{message}</p>
            <p style={{ color: "rgba(240,236,227,0.45)", fontSize: 13 }}>
              Du wirst gleich weitergeleitet …
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(200,50,50,0.15)",
              border: "2px solid rgba(200,50,50,0.6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: 28, color: "#e05555",
            }}>✕</div>
            <h2 style={{ color: "#f0ece3", fontWeight: 700, marginBottom: 8 }}>
              Zahlung nicht abgeschlossen
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
