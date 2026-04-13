// ══════════════════════════════════════════════════════════════════════════════
// AdminPanel – Lehrer-Dashboard: Lizenz, Abo-Verwaltung, Statistiken
// ══════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { X, Users, BookOpen, Play, Crown, GraduationCap, PauseCircle, XCircle, Settings, FileText } from "lucide-react";
import { apiFetch } from "../../api.js";
import { PaymentButton } from "../payment/PaymentButton.jsx";

const LIZENZ_LABEL = { free: "Kostenlos", pro: "Pro", schule: "Schule" };
const LIZENZ_COLOR = { free: "rgba(240,236,227,0.4)", pro: "#e8600a", schule: "#4ea8de" };

function fmt(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export function TeacherPanel({ onClose }) {
  const [data,    setData]    = useState(null);
  const [sub,     setSub]     = useState(null);
  const [invoice, setInvoice] = useState(null); // pending invoice if any
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [payErr,  setPayErr]  = useState("");
  const [subBusy, setSubBusy] = useState(false);
  const [subMsg,  setSubMsg]  = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch("/teacher/dashboard",          "GET", null, 12000, true),
      apiFetch("/payment/subscription/status","GET", null, 12000, false),
      apiFetch("/payment/invoice/status",     "GET", null, 12000, false),
    ])
      .then(([dashboard, subscription, inv]) => {
        setData(dashboard);
        setSub(subscription?.has_subscription ? subscription : null);
        setInvoice(inv?.has_invoice && inv?.status === "pending" ? inv : null);
      })
      .catch(e => setError(e.message || "Konnte nicht geladen werden"))
      .finally(() => setLoading(false));
  }, []);

  async function handlePortal() {
    setSubBusy(true); setSubMsg("");
    try {
      const res = await apiFetch("/payment/stripe/customer-portal", "POST", null, 20000, true);
      if (res?.portal_url) window.location.href = res.portal_url;
    } catch (e) { setSubMsg(e.message || "Fehler"); }
    finally { setSubBusy(false); }
  }

  async function handlePause() {
    if (!confirm("Abo wirklich pausieren? Zugang bleibt bis Periodenende aktiv.")) return;
    setSubBusy(true); setSubMsg("");
    try {
      await apiFetch("/payment/stripe/pause", "POST", null, 20000, true);
      setSubMsg("Abo pausiert.");
      setSub(s => s ? { ...s, status: "paused" } : s);
    } catch (e) { setSubMsg(e.message || "Fehler"); }
    finally { setSubBusy(false); }
  }

  async function handleCancel() {
    if (!confirm("Abo wirklich kündigen? Es läuft bis zum Periodenende.")) return;
    setSubBusy(true); setSubMsg("");
    try {
      await apiFetch("/payment/stripe/cancel", "POST", null, 20000, true);
      setSubMsg("Abo wird zum Periodenende beendet.");
      setSub(s => s ? { ...s, status: "cancelled" } : s);
    } catch (e) { setSubMsg(e.message || "Fehler"); }
    finally { setSubBusy(false); }
  }

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
  const actionBtn = (color = "rgba(240,236,227,0.08)") => ({
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 14px", borderRadius: "8px",
    border: "1px solid rgba(240,236,227,0.12)",
    background: color,
    color: "#f0ece3", fontSize: 13, fontWeight: 600,
    cursor: subBusy ? "not-allowed" : "pointer",
    opacity: subBusy ? 0.6 : 1,
  });

  const intervalLabel = sub?.interval === "year" ? "Jahr" : "Monat";
  const periodEnd     = fmt(sub?.current_period_end);
  const remaining     = daysLeft(sub?.current_period_end);

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
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(240,236,227,0.5)", cursor: "pointer", padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "16px 20px 24px" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(240,236,227,0.5)" }}>Laden …</div>
          )}

          {error && (
            <div style={{ background: "rgba(200,50,50,0.1)", border: "1px solid rgba(200,50,50,0.3)", borderRadius: "10px", padding: "12px 16px", color: "#e05555", fontSize: 14 }}>
              {error}
            </div>
          )}

          {data && (
            <>
              {/* Lizenz-Status */}
              <div style={sectionStyle}>
                <span style={labelStyle}>Lizenz-Status</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <Crown size={16} color={LIZENZ_COLOR[data.lizenz_info.typ] || "#f0ece3"} />
                  <span style={{ color: LIZENZ_COLOR[data.lizenz_info.typ] || "#f0ece3", fontWeight: 700, fontSize: 18 }}>
                    {LIZENZ_LABEL[data.lizenz_info.typ] || data.lizenz_info.typ}
                  </span>
                </div>
                {data.lizenz_info.bis && (
                  <p style={{ color: "rgba(240,236,227,0.55)", fontSize: 13, margin: 0 }}>
                    Gültig bis:{" "}
                    <strong style={{ color: "#f0ece3" }}>{fmt(data.lizenz_info.bis)}</strong>
                  </p>
                )}

                {/* Aktives Stripe-Abo */}
                {sub && sub.status === "active" && (
                  <div style={{ marginTop: 14, borderTop: "1px solid rgba(240,236,227,0.08)", paddingTop: 12 }}>
                    <span style={labelStyle}>Abo-Details</span>
                    <p style={{ color: "rgba(240,236,227,0.7)", fontSize: 13, margin: "0 0 4px" }}>
                      {sub.amount_eur?.toFixed(2).replace(".", ",")} € / {intervalLabel} · via {sub.provider === "stripe" ? "Stripe" : "PayPal"}
                    </p>
                    {periodEnd && (
                      <p style={{ color: "rgba(240,236,227,0.5)", fontSize: 12, margin: "0 0 12px" }}>
                        Verlängert sich am {periodEnd}
                        {remaining !== null && remaining <= 7 && (
                          <span style={{ color: "#e8600a", marginLeft: 6 }}>({remaining} Tage)</span>
                        )}
                      </p>
                    )}
                    {subMsg && (
                      <p style={{ color: "#e8600a", fontSize: 13, marginBottom: 10 }}>{subMsg}</p>
                    )}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {sub.provider === "stripe" && (
                        <button style={actionBtn()} onClick={handlePortal} disabled={subBusy}>
                          <Settings size={13} /> Verwalten
                        </button>
                      )}
                      {sub.provider === "stripe" && sub.status === "active" && (
                        <button style={actionBtn()} onClick={handlePause} disabled={subBusy}>
                          <PauseCircle size={13} /> Pausieren
                        </button>
                      )}
                      <button style={actionBtn("rgba(200,50,50,0.08)")} onClick={handleCancel} disabled={subBusy}>
                        <XCircle size={13} /> Kündigen
                      </button>
                    </div>
                  </div>
                )}

                {/* Pausiertes Abo */}
                {sub && sub.status === "paused" && (
                  <div style={{ marginTop: 14, borderTop: "1px solid rgba(240,236,227,0.08)", paddingTop: 12 }}>
                    <p style={{ color: "rgba(240,236,227,0.5)", fontSize: 13, marginBottom: 10 }}>
                      Abo pausiert – Zugang bis {periodEnd}
                    </p>
                    {sub.provider === "stripe" && (
                      <button style={actionBtn()} onClick={handlePortal} disabled={subBusy}>
                        <Settings size={13} /> Im Stripe-Portal fortsetzen
                      </button>
                    )}
                  </div>
                )}

                {/* Ausstehende Rechnung */}
                {invoice && (
                  <div style={{
                    marginTop: 14, borderTop: "1px solid rgba(240,236,227,0.08)", paddingTop: 12,
                  }}>
                    <div style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      background: "rgba(232,96,10,0.06)",
                      border: "1px solid rgba(232,96,10,0.2)",
                      borderRadius: "10px", padding: "12px 14px",
                    }}>
                      <FileText size={16} color="#e8600a" style={{ marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#f0ece3" }}>
                          Rechnung ausstehend
                        </p>
                        <p style={{ margin: "0 0 4px", fontSize: 12, color: "rgba(240,236,227,0.6)" }}>
                          Rechnungsnummer:{" "}
                          <span style={{ fontFamily: "monospace", color: "#e8600a" }}>
                            {invoice.invoice_number}
                          </span>
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: "rgba(240,236,227,0.5)" }}>
                          Fällig bis: {fmt(invoice.due_date)} · 4,99 € per Banküberweisung
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Free: Upgrade-Optionen */}
                {data.lizenz_info.typ === "free" && !invoice && (
                  <div style={{ marginTop: 14 }}>
                    {payErr && <p style={{ color: "#e05555", fontSize: 13, marginBottom: 8 }}>{payErr}</p>}
                    <PaymentButton onError={setPayErr} />
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
