// ══════════════════════════════════════════════════════════════════════════════
// PaymentButton – Leitet zu PayPal weiter (Pro-Lizenz €9/Monat)
// ══════════════════════════════════════════════════════════════════════════════
import { useState } from "react";
import { apiFetch } from "../../api.js";

export function PaymentButton({ onError }) {
  const [loading, setLoading] = useState(false);

  async function handlePayment() {
    setLoading(true);
    try {
      const res = await apiFetch(
        "/payment/create-order",
        "POST",
        { product_type: "pro_monthly" },
        30000,
        true, // throwOnError
      );
      if (res?.approval_url) {
        window.location.href = res.approval_url;
      } else {
        onError?.("Zahlungsseite konnte nicht geöffnet werden");
      }
    } catch (e) {
      onError?.(e.message || "Zahlungsseite konnte nicht geöffnet werden");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="bw-btn-primary"
      style={{
        padding: "12px 24px",
        borderRadius: "10px",
        fontWeight: 700,
        fontSize: "15px",
        color: "#fff",
        cursor: loading ? "not-allowed" : "pointer",
        width: "100%",
      }}
    >
      {loading ? "Wird weitergeleitet …" : "Jetzt Pro-Lizenz kaufen (€9 / Monat)"}
    </button>
  );
}
