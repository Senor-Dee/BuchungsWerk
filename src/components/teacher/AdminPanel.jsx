// ══════════════════════════════════════════════════════════════════════════════
// AdminPanel – Lehrer-Dashboard: Lizenz, Schüler, Quizze
// ══════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { X, Users, BookOpen, Play, Crown, GraduationCap } from "lucide-react";
import { apiFetch } from "../../api.js";
import { PaymentButton } from "../payment/PaymentButton.jsx";

const LIZENZ_LABEL = { free: "Kostenlos", pro: "Pro", schule: "Schule" };
const LIZENZ_COLOR = { free: "rgba(240,236,227,0.4)", pro: "#e8600a", schule: "#4ea8de" };

export function TeacherPanel({ onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [payErr,  setPayErr]  = useState("");

  useEffect(() => {
    apiFetch("/teacher/dashboard", "GET", null, 12000, true)
      .then(setData)
      .catch(e => setError(e.message || "Konnte nicht geladen werden"))
      .finally(() => setLoading(false));
  }, []);

  const panelStyle = {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.65)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1900, padding: "16px",
    fontFamily: "'IBM Plex Sans', sans-serif",
  };
  const cardStyle = {
    background: "rgba(18,12,5,0.98)",
    border: "1px solid rgba(240,236,227,0.1)",
    borderTop: "2px solid #e8600a",
    borderRadius: "18px",
    width: "100%", maxWidth: 480,
    maxHeight: "90vh", overflowY: "auto",
    boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
  };
  const sectionStyle = {
    background: "rgba(240,236,227,0.04)",
    border: "1px solid rgba(240,236,227,0.08)",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: 12,
  };
  const labelStyle = {
    fontSize: 11, fontWeight: 700,
    color: "rgba(240,236,227,0.4)",
    textTransform: "uppercase", letterSpacing: ".06em",
    marginBottom: 4, display: "block",
  };

  return (
    <div style={panelStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid rgba(240,236,227,0.08)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0,
          background: "rgba(18,12,5,0.98)",
          backdropFilter: "blur(12px)",
          borderRadius: "18px 18px 0 0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <GraduationCap size={18} color="#e8600a" />
            <span style={{ color: "#f0ece3", fontWeight: 700, fontSize: 16 }}>Mein Dashboard</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none",
              color: "rgba(240,236,227,0.5)", cursor: "pointer",
              padding: 4, borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "16px 20px 24px" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(240,236,227,0.5)" }}>
              Laden …
            </div>
          )}

          {error && (
            <div style={{
              background: "rgba(200,50,50,0.1)", border: "1px solid rgba(200,50,50,0.3)",
              borderRadius: "10px", padding: "12px 16px",
              color: "#e05555", fontSize: 14,
            }}>
              {error}
            </div>
          )}

          {data && (
            <>
              {/* Lizenz */}
              <div style={sectionStyle}>
                <span style={labelStyle}>Lizenz-Status</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <Crown size={16} color={LIZENZ_COLOR[data.lizenz_info.typ] || "#f0ece3"} />
                  <span style={{
                    color: LIZENZ_COLOR[data.lizenz_info.typ] || "#f0ece3",
                    fontWeight: 700, fontSize: 18,
                  }}>
                    {LIZENZ_LABEL[data.lizenz_info.typ] || data.lizenz_info.typ}
                  </span>
                </div>
                {data.lizenz_info.bis && (
                  <p style={{ color: "rgba(240,236,227,0.55)", fontSize: 13, margin: 0 }}>
                    Gültig bis:{" "}
                    <strong style={{ color: "#f0ece3" }}>
                      {new Date(data.lizenz_info.bis).toLocaleDateString("de-DE")}
                    </strong>
                  </p>
                )}
                {data.lizenz_info.typ === "free" && (
                  <div style={{ marginTop: 14 }}>
                    {payErr && (
                      <p style={{ color: "#e05555", fontSize: 13, marginBottom: 8 }}>{payErr}</p>
                    )}
                    <PaymentButton onError={setPayErr} />
                    <p style={{
                      color: "rgba(240,236,227,0.4)", fontSize: 12,
                      marginTop: 8, textAlign: "center",
                    }}>
                      Klassen 8–10 freischalten · einmalig €9/Monat
                    </p>
                  </div>
                )}
              </div>

              {/* Statistiken */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                {[
                  { icon: <Users size={18} color="#e8600a" />, label: "Schüler", value: data.schueler_count },
                  { icon: <BookOpen size={18} color="#e8600a" />, label: "Klassen", value: data.klassen_count },
                  { icon: <Play size={18} color="#e8600a" />, label: "Quizze", value: data.quiz_count },
                ].map(({ icon, label, value }) => (
                  <div key={label} style={{
                    background: "rgba(240,236,227,0.04)",
                    border: "1px solid rgba(240,236,227,0.08)",
                    borderRadius: "12px", padding: "14px 12px",
                    textAlign: "center",
                  }}>
                    <div style={{ marginBottom: 6 }}>{icon}</div>
                    <div style={{ color: "#f0ece3", fontWeight: 700, fontSize: 22 }}>{value}</div>
                    <div style={{ color: "rgba(240,236,227,0.4)", fontSize: 11, marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
