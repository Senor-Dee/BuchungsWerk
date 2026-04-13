// ══════════════════════════════════════════════════════════════════════════════
// PaymentButton – Zahlungsoptionen: Stripe / PayPal Abo / Rechnung
// ══════════════════════════════════════════════════════════════════════════════
import { useState } from "react";
import { apiFetch } from "../../api.js";
import { CreditCard, Calendar, Wallet, FileText } from "lucide-react";

const STRIPE_OPTIONS = [
  {
    key:       "stripe_monthly",
    icon:      <CreditCard size={15} />,
    label:     "4,99 € / Monat",
    sublabel:  "Karte oder SEPA-Lastschrift",
    provider:  "stripe",
    plan:      "monthly",
    highlight: false,
  },
  {
    key:       "stripe_yearly",
    icon:      <Calendar size={15} />,
    label:     "50,00 € / Jahr",
    sublabel:  "2 Monate gratis · Karte oder SEPA",
    provider:  "stripe",
    plan:      "yearly",
    highlight: true,
  },
];

export function PaymentButton({ onError }) {
  const [loading, setLoading]       = useState(null);
  const [invoice, setInvoice]       = useState(null); // { invoice_number, due_date }
  const [invoiceError, setInvoiceError] = useState(null);

  async function handleStripe(plan) {
    setLoading("stripe_" + plan);
    try {
      const res = await apiFetch(
        "/payment/stripe/create-checkout",
        "POST",
        { plan },
        30000,
        true,
      );
      if (res?.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        onError?.("Stripe-Seite konnte nicht geöffnet werden");
      }
    } catch (e) {
      onError?.(e.message || "Zahlungsseite konnte nicht geöffnet werden");
    } finally {
      setLoading(null);
    }
  }

  async function handlePayPalSubscription() {
    setLoading("paypal_sub");
    try {
      const res = await apiFetch(
        "/payment/paypal/create-subscription",
        "POST",
        { plan_type: "monthly" },
        30000,
        true,
      );
      if (res?.approval_url) {
        window.location.href = res.approval_url;
      } else {
        onError?.("PayPal-Seite konnte nicht geöffnet werden");
      }
    } catch (e) {
      onError?.(e.message || "PayPal-Abo konnte nicht gestartet werden");
    } finally {
      setLoading(null);
    }
  }

  async function handleInvoice() {
    setLoading("invoice");
    setInvoiceError(null);
    try {
      const res = await apiFetch(
        "/payment/invoice/create",
        "POST",
        { plan_type: "pro_monthly" },
        30000,
        true,
      );
      setInvoice(res);
    } catch (e) {
      setInvoiceError(e.message || "Rechnung konnte nicht erstellt werden");
    } finally {
      setLoading(null);
    }
  }

  // Nach erfolgreicher Rechnungsanforderung
  if (invoice) {
    return (
      <div style={{
        padding:      "16px",
        background:   "rgba(232,96,10,0.06)",
        border:       "1px solid rgba(232,96,10,0.25)",
        borderRadius: "12px",
        color:        "#f0ece3",
      }}>
        <div style={{ fontSize: 18, marginBottom: 8 }}>✅ Rechnung angefordert!</div>
        <p style={{ fontSize: 13, color: "rgba(240,236,227,0.7)", margin: "0 0 12px" }}>
          Die Rechnung wurde an deine E-Mail-Adresse gesendet. Bitte überweise{" "}
          <strong>4,99 €</strong> mit folgendem Verwendungszweck:
        </p>
        <div style={{
          fontFamily:   "monospace",
          fontSize:     16,
          fontWeight:   700,
          color:        "#e8600a",
          background:   "rgba(232,96,10,0.1)",
          border:       "1px solid rgba(232,96,10,0.3)",
          borderRadius: "8px",
          padding:      "10px 14px",
          marginBottom: 12,
          letterSpacing: ".05em",
        }}>
          {invoice.invoice_number}
        </div>
        <p style={{ fontSize: 12, color: "rgba(240,236,227,0.5)", margin: 0 }}>
          Fällig bis: {invoice.due_date} · Die Lizenz wird nach Zahlungseingang manuell aktiviert (1–2 Werktage).
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

      {/* Stripe Optionen */}
      {STRIPE_OPTIONS.map(opt => (
        <button
          key={opt.key}
          onClick={() => handleStripe(opt.plan)}
          disabled={loading !== null}
          style={{
            position:      "relative",
            display:       "flex",
            alignItems:    "center",
            gap:           10,
            padding:       "11px 16px",
            borderRadius:  "10px",
            border:        opt.highlight
              ? "1.5px solid #e8600a"
              : "1px solid rgba(240,236,227,0.12)",
            background:    opt.highlight
              ? "rgba(232,96,10,0.08)"
              : "rgba(240,236,227,0.04)",
            cursor:        loading !== null ? "not-allowed" : "pointer",
            textAlign:     "left",
            width:         "100%",
            opacity:       loading !== null && loading !== opt.key ? 0.5 : 1,
            transition:    "opacity .15s",
          }}
        >
          <span style={{ color: opt.highlight ? "#e8600a" : "rgba(240,236,227,0.6)" }}>
            {opt.icon}
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", color: "#f0ece3", fontWeight: 700, fontSize: 14 }}>
              {loading === opt.key ? "Weiterleitung …" : opt.label}
            </span>
            <span style={{ display: "block", color: "rgba(240,236,227,0.45)", fontSize: 12, marginTop: 1 }}>
              {opt.sublabel}
            </span>
          </span>
          {opt.highlight && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: "#e8600a",
              background: "rgba(232,96,10,0.15)", border: "1px solid rgba(232,96,10,0.3)",
              borderRadius: "4px", padding: "2px 6px",
              letterSpacing: ".04em", textTransform: "uppercase",
            }}>
              Empfohlen
            </span>
          )}
        </button>
      ))}

      {/* PayPal Abo */}
      <button
        onClick={handlePayPalSubscription}
        disabled={loading !== null}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "11px 16px", borderRadius: "10px",
          border: "1px solid rgba(240,236,227,0.12)",
          background: "rgba(240,236,227,0.04)",
          cursor: loading !== null ? "not-allowed" : "pointer",
          textAlign: "left", width: "100%",
          opacity: loading !== null && loading !== "paypal_sub" ? 0.5 : 1,
          transition: "opacity .15s",
        }}
      >
        <span style={{ color: "rgba(240,236,227,0.6)" }}>
          <Wallet size={15} />
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", color: "#f0ece3", fontWeight: 700, fontSize: 14 }}>
            {loading === "paypal_sub" ? "Weiterleitung …" : "4,99 € / Monat"}
          </span>
          <span style={{ display: "block", color: "rgba(240,236,227,0.45)", fontSize: 12, marginTop: 1 }}>
            Mit PayPal abonnieren
          </span>
        </span>
      </button>

      {/* Rechnung / Überweisung */}
      <button
        onClick={handleInvoice}
        disabled={loading !== null}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "11px 16px", borderRadius: "10px",
          border: "1px solid rgba(240,236,227,0.12)",
          background: "rgba(240,236,227,0.04)",
          cursor: loading !== null ? "not-allowed" : "pointer",
          textAlign: "left", width: "100%",
          opacity: loading !== null && loading !== "invoice" ? 0.5 : 1,
          transition: "opacity .15s",
        }}
      >
        <span style={{ color: "rgba(240,236,227,0.6)" }}>
          <FileText size={15} />
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", color: "#f0ece3", fontWeight: 700, fontSize: 14 }}>
            {loading === "invoice" ? "Rechnung wird erstellt …" : "Per Rechnung / Überweisung"}
          </span>
          <span style={{ display: "block", color: "rgba(240,236,227,0.45)", fontSize: 12, marginTop: 1 }}>
            Für Schulen · Rechnung per E-Mail, 14 Tage Zahlungsziel
          </span>
        </span>
      </button>

      {invoiceError && (
        <p style={{ fontSize: 12, color: "#f87171", margin: "0 4px" }}>
          {invoiceError}
        </p>
      )}

      <p style={{
        marginTop: 4, padding: "7px 12px",
        background: "rgba(240,236,227,0.04)",
        border: "1px solid rgba(240,236,227,0.08)",
        borderRadius: "8px", fontSize: 11,
        color: "rgba(240,236,227,0.4)", lineHeight: 1.5, textAlign: "center",
      }}>
        <strong style={{ color: "rgba(240,236,227,0.6)" }}>Beta-Hinweis:</strong>{" "}
        Kein echtes Abo nötig — dieser Bereich dient nur zur Demonstration. Als Tester musst du nichts kaufen.
      </p>
    </div>
  );
}
