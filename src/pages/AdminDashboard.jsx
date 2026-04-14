// ══════════════════════════════════════════════════════════════════════════════
// AdminDashboard – Phase 4.4: Revenue Analytics & Payment Management
// ══════════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { API_URL } from "../api.js";
import {
  TrendingUp, Users, Crown, AlertTriangle, Download,
  CreditCard, FileText, Activity, ChevronRight, RefreshCw,
} from "lucide-react";

// ── Auth helper ───────────────────────────────────────────────────────────────
function getToken() {
  try { return localStorage.getItem("bw_token"); } catch { return null; }
}
async function adminFetch(path) {
  const token = getToken();
  const res = await fetch(API_URL + path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
  return data;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: "100vh",
    background: "#0e0906",
    fontFamily: "'IBM Plex Sans', sans-serif",
    color: "#f0ece3",
    padding: "0 0 60px",
  },
  header: {
    background: "rgba(18,12,5,0.98)",
    borderBottom: "1px solid rgba(240,236,227,0.08)",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  container: { maxWidth: 1100, margin: "0 auto", padding: "24px 20px" },
  tabBar: {
    display: "flex",
    gap: 0,
    borderBottom: "1px solid rgba(240,236,227,0.08)",
    marginBottom: 24,
    overflowX: "auto",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 12,
    marginBottom: 24,
  },
  card: {
    background: "rgba(240,236,227,0.04)",
    border: "1px solid rgba(240,236,227,0.08)",
    borderRadius: 12,
    padding: "16px 18px",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    color: "rgba(240,236,227,0.4)",
    textTransform: "uppercase",
    letterSpacing: ".06em",
    padding: "6px 10px",
    borderBottom: "1px solid rgba(240,236,227,0.08)",
  },
  td: {
    padding: "9px 10px",
    fontSize: 13,
    color: "rgba(240,236,227,0.75)",
    borderBottom: "1px solid rgba(240,236,227,0.05)",
  },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 13px",
    borderRadius: 8,
    border: "1px solid rgba(240,236,227,0.12)",
    background: "rgba(240,236,227,0.05)",
    color: "rgba(240,236,227,0.7)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  btnOrange: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 13px",
    borderRadius: 8,
    border: "1px solid rgba(232,96,10,0.4)",
    background: "rgba(232,96,10,0.12)",
    color: "#e8600a",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  btnGreen: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 11px",
    borderRadius: 7,
    border: "1px solid rgba(74,222,128,0.3)",
    background: "rgba(74,222,128,0.08)",
    color: "#4ade80",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "rgba(240,236,227,0.5)",
    textTransform: "uppercase",
    letterSpacing: ".06em",
    marginBottom: 12,
  },
};

// ── Small helpers ─────────────────────────────────────────────────────────────
function fmt(dateStr) {
  if (!dateStr) return "–";
  try { return new Date(dateStr).toLocaleDateString("de-DE"); } catch { return dateStr; }
}
function eur(n) {
  return `${(n ?? 0).toFixed(2).replace(".", ",")} €`;
}
function Badge({ color = "gray", children }) {
  const colors = {
    green:  { bg: "rgba(74,222,128,0.12)",  text: "#4ade80" },
    orange: { bg: "rgba(232,96,10,0.12)",   text: "#e8600a" },
    red:    { bg: "rgba(220,38,38,0.12)",   text: "#f87171" },
    gray:   { bg: "rgba(240,236,227,0.08)", text: "rgba(240,236,227,0.5)" },
    blue:   { bg: "rgba(96,165,250,0.12)",  text: "#60a5fa" },
  };
  const c = colors[color] || colors.gray;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
      background: c.bg, color: c.text, letterSpacing: ".04em",
    }}>
      {children}
    </span>
  );
}

// ── SVG mini bar chart (no library) ──────────────────────────────────────────
function ProviderBarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 220, H = 80, barW = 36, gap = 12;
  return (
    <svg width={W} height={H + 30} style={{ overflow: "visible" }}>
      {data.map((d, i) => {
        const barH = Math.max(4, (d.value / max) * H);
        const x = i * (barW + gap) + 4;
        const y = H - barH;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barW} height={barH}
              rx={4} fill="#e8600a" opacity={0.75} />
            <text x={x + barW / 2} y={H + 14} textAnchor="middle"
              fontSize={10} fill="rgba(240,236,227,0.45)">{d.label}</text>
            <text x={x + barW / 2} y={y - 4} textAnchor="middle"
              fontSize={11} fontWeight={700} fill="#f0ece3">{d.value}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({ icon, label, value, sub, accent = false }) {
  return (
    <div style={{
      ...S.card,
      borderColor: accent ? "rgba(232,96,10,0.25)" : "rgba(240,236,227,0.08)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ color: accent ? "#e8600a" : "rgba(240,236,227,0.4)" }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,236,227,0.4)",
          textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent ? "#e8600a" : "#f0ece3",
        lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "rgba(240,236,227,0.35)" }}>{sub}</div>}
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────
function Tab({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: "10px 18px", background: "none", border: "none",
      borderBottom: active ? "2px solid #e8600a" : "2px solid transparent",
      color: active ? "#e8600a" : "rgba(240,236,227,0.35)",
      fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
      whiteSpace: "nowrap", transition: "color .12s",
    }}>
      {children}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: ÜBERSICHT
// ══════════════════════════════════════════════════════════════════════════════
function OverviewTab({ kpis, onTabChange }) {
  if (!kpis) return null;
  const { revenue, subscriptions, users, health, invoices_pending } = kpis;
  return (
    <div>
      {/* Ausstehende Rechnungen Alert */}
      {invoices_pending?.count > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          background: "rgba(232,96,10,0.08)", border: "1px solid rgba(232,96,10,0.25)",
          borderRadius: 10, padding: "12px 16px", marginBottom: 20,
        }}>
          <AlertTriangle size={16} color="#e8600a" />
          <span style={{ fontSize: 13, flex: 1 }}>
            <strong style={{ color: "#e8600a" }}>{invoices_pending.count} Rechnung{invoices_pending.count !== 1 ? "en" : ""}</strong>
            {" "}ausstehend · {eur(invoices_pending.amount)} offen
          </span>
          <button style={S.btnOrange} onClick={() => onTabChange("invoices")}>
            Ansehen <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* Revenue KPIs */}
      <div style={S.sectionTitle}>Revenue</div>
      <div style={S.kpiGrid}>
        <KPICard accent icon={<TrendingUp size={15} />} label="MRR"
          value={eur(revenue?.mrr)} sub={`ARR: ${eur(revenue?.arr)}`} />
        <KPICard icon={<CreditCard size={15} />} label="Diesen Monat"
          value={eur(revenue?.total_paid_this_month)} sub="Eingegangene Zahlungen" />
        <KPICard icon={<TrendingUp size={15} />} label="Lifetime Revenue"
          value={eur(revenue?.total_lifetime)} sub="Gesamt seit Launch" />
      </div>

      {/* Subscription KPIs */}
      <div style={S.sectionTitle}>Abonnements</div>
      <div style={S.kpiGrid}>
        <KPICard icon={<Activity size={15} />} label="Aktive Abos"
          value={subscriptions?.active ?? 0} sub={`${subscriptions?.paused ?? 0} pausiert`} />
        <KPICard icon={<Crown size={15} />} label="Pro-User"
          value={`${users?.pro ?? 0}`} sub={`${users?.pro_percentage ?? 0} % von ${users?.total ?? 0} gesamt`} />
        <KPICard icon={<Users size={15} />} label="Churn (30d)"
          value={`${health?.churn_rate_30d ?? 0} %`}
          sub={`${subscriptions?.cancelled_this_month ?? 0} Kündigungen`} />
        <KPICard icon={<TrendingUp size={15} />} label="LTV"
          value={eur(health?.ltv)} sub={`ARPU: ${eur(health?.arpu)}/Monat`} />
      </div>

      {/* Provider Chart */}
      <div style={{ ...S.card, marginBottom: 24 }}>
        <div style={S.sectionTitle}>Aktive Abos nach Zahlungsart</div>
        <ProviderBarChart data={[
          { label: "Stripe",   value: subscriptions?.active_stripe  ?? 0 },
          { label: "PayPal",   value: subscriptions?.active_paypal  ?? 0 },
          { label: "Rechnung", value: subscriptions?.active_invoice ?? 0 },
        ]} />
      </div>

      {/* User Stats */}
      <div style={S.sectionTitle}>Nutzer</div>
      <div style={S.kpiGrid}>
        <KPICard icon={<Users size={15} />} label="Gesamt" value={users?.total ?? 0} />
        <KPICard icon={<Users size={15} />} label="Free"   value={users?.free ?? 0} />
        <KPICard icon={<Crown size={15} />} label="Pro"    value={users?.pro ?? 0} />
        <KPICard icon={<Users size={15} />} label="Schule" value={users?.schule ?? 0} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: TRANSAKTIONEN
// ══════════════════════════════════════════════════════════════════════════════
function TransactionTab() {
  const [rows, setRows]         = useState(null);
  const [provFilter, setProv]   = useState("");
  const [statFilter, setStat]   = useState("");

  useEffect(() => {
    setRows(null);
    const q = new URLSearchParams();
    if (provFilter) q.set("provider", provFilter);
    if (statFilter) q.set("status",   statFilter);
    adminFetch(`/admin/analytics/transactions?${q}`)
      .then(setRows)
      .catch(() => setRows([]));
  }, [provFilter, statFilter]);

  function downloadCSV() {
    const token = getToken();
    const a = document.createElement("a");
    a.href = `${API_URL}/admin/export/transactions.csv`;
    a.setAttribute("download", "");
    // Trigger via fetch to attach auth header
    fetch(a.href, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const el = document.createElement("a");
        el.href = url; el.download = "buchungswerk-transaktionen.csv"; el.click();
        URL.revokeObjectURL(url);
      });
  }

  const statusBadge = s => {
    if (s === "active" || s === "paid")      return <Badge color="green">{s}</Badge>;
    if (s === "pending")                      return <Badge color="orange">ausstehend</Badge>;
    if (s === "cancelled" || s === "expired") return <Badge color="red">{s}</Badge>;
    if (s === "paused")                       return <Badge color="blue">pausiert</Badge>;
    return <Badge>{s}</Badge>;
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <select value={provFilter} onChange={e => setProv(e.target.value)} style={{
          background: "rgba(240,236,227,0.06)", border: "1px solid rgba(240,236,227,0.12)",
          color: "#f0ece3", borderRadius: 7, padding: "6px 10px", fontSize: 12, fontFamily: "inherit",
        }}>
          <option value="">Alle Provider</option>
          <option value="stripe">Stripe</option>
          <option value="paypal">PayPal</option>
          <option value="invoice">Rechnung</option>
        </select>
        <select value={statFilter} onChange={e => setStat(e.target.value)} style={{
          background: "rgba(240,236,227,0.06)", border: "1px solid rgba(240,236,227,0.12)",
          color: "#f0ece3", borderRadius: 7, padding: "6px 10px", fontSize: 12, fontFamily: "inherit",
        }}>
          <option value="">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="pending">Ausstehend</option>
          <option value="cancelled">Gekündigt</option>
          <option value="paused">Pausiert</option>
        </select>
        <div style={{ flex: 1 }} />
        <button style={S.btn} onClick={downloadCSV}>
          <Download size={13} /> CSV exportieren
        </button>
      </div>

      {rows === null && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(240,236,227,0.3)" }}>Laden…</div>
      )}
      {rows !== null && rows.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(240,236,227,0.2)", fontSize: 13 }}>
          Keine Transaktionen gefunden.
        </div>
      )}
      {rows !== null && rows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                {["Datum","User","Provider","Betrag","Intervall","Status","Nächste Zahlung"].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(240,236,227,0.015)" }}>
                  <td style={S.td}>{fmt(r.date)}</td>
                  <td style={{ ...S.td, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.user_email}
                  </td>
                  <td style={S.td}>
                    <Badge color={r.provider === "stripe" ? "blue" : r.provider === "paypal" ? "orange" : "gray"}>
                      {r.provider}
                    </Badge>
                  </td>
                  <td style={{ ...S.td, fontWeight: 700, color: "#f0ece3" }}>{eur(r.amount)}</td>
                  <td style={S.td}>{r.interval === "year" ? "Jährlich" : r.interval === "month" ? "Monatlich" : r.interval}</td>
                  <td style={S.td}>{statusBadge(r.status)}</td>
                  <td style={S.td}>{fmt(r.next_billing)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: RECHNUNGEN
// ══════════════════════════════════════════════════════════════════════════════
function InvoiceTab() {
  const [data, setData]   = useState(null);
  const [msg,  setMsg]    = useState("");
  const [busy, setBusy]   = useState(null);

  function load() {
    adminFetch("/admin/analytics/invoice-summary").then(setData).catch(() => setData(null));
  }
  useEffect(load, []);

  async function confirmPaid(inv_nr) {
    if (!confirm(`Rechnung ${inv_nr} als bezahlt markieren?`)) return;
    setBusy(inv_nr); setMsg("");
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/invoice/confirm-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ invoice_number: inv_nr, lizenz_tage: 30 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMsg(`✅ ${inv_nr} als bezahlt markiert.`);
      load();
    } catch (e) { setMsg(e.message); }
    finally { setBusy(null); }
  }

  async function resend(inv_nr) {
    setBusy("resend_" + inv_nr); setMsg("");
    try {
      const token = getToken();
      await fetch(`${API_URL}/admin/invoice/resend-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ invoice_number: inv_nr, lizenz_tage: 0 }),
      });
      setMsg(`📧 Erinnerung für ${inv_nr} gesendet.`);
    } catch (e) { setMsg(e.message); }
    finally { setBusy(null); }
  }

  function downloadCSV() {
    const token = getToken();
    fetch(`${API_URL}/admin/export/invoices.csv`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const el = document.createElement("a");
        el.href = url; el.download = "buchungswerk-rechnungen.csv"; el.click();
        URL.revokeObjectURL(url);
      });
  }

  if (!data) return <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(240,236,227,0.3)" }}>Laden…</div>;

  return (
    <div>
      {/* Statistik-Chips */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Ausgestellt",  value: data.total_issued, color: "rgba(240,236,227,0.6)" },
          { label: "Ausstehend",   value: data.pending,      color: "#e8600a" },
          { label: "Bezahlt",      value: data.paid,         color: "#4ade80" },
          { label: "Abgelaufen",   value: data.expired,      color: "#f87171" },
        ].map(s => (
          <div key={s.label} style={{
            background: "rgba(240,236,227,0.04)", border: "1px solid rgba(240,236,227,0.08)",
            borderRadius: 10, padding: "10px 16px", textAlign: "center", minWidth: 90,
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "rgba(240,236,227,0.4)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
        {data.pending_amount > 0 && (
          <div style={{
            background: "rgba(232,96,10,0.06)", border: "1px solid rgba(232,96,10,0.2)",
            borderRadius: 10, padding: "10px 16px", textAlign: "center", minWidth: 100,
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#e8600a" }}>{eur(data.pending_amount)}</div>
            <div style={{ fontSize: 11, color: "rgba(240,236,227,0.4)", marginTop: 2 }}>Offen</div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button style={S.btn} onClick={downloadCSV}>
          <Download size={13} /> CSV exportieren
        </button>
      </div>

      {msg && <div style={{ marginBottom: 12, fontSize: 13, color: "#4ade80" }}>{msg}</div>}

      {data.pending_list.length === 0 ? (
        <div style={{ textAlign: "center", padding: "30px 0", color: "rgba(240,236,227,0.2)", fontSize: 13 }}>
          Keine ausstehenden Rechnungen.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={S.sectionTitle}>Ausstehende Rechnungen</div>
          <table style={S.table}>
            <thead>
              <tr>
                {["Rechnungsnr.","User","Betrag","Fällig","Noch","Aktionen"].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.pending_list.map(inv => (
                <tr key={inv.invoice_number}>
                  <td style={{ ...S.td, fontFamily: "monospace", color: "#e8600a" }}>
                    {inv.invoice_number}
                  </td>
                  <td style={{ ...S.td, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {inv.user_email}
                  </td>
                  <td style={{ ...S.td, fontWeight: 700, color: "#f0ece3" }}>{eur(inv.amount)}</td>
                  <td style={S.td}>{fmt(inv.due_date)}</td>
                  <td style={S.td}>
                    <Badge color={inv.days_until_expiry <= 3 ? "red" : inv.days_until_expiry <= 7 ? "orange" : "gray"}>
                      {inv.days_until_expiry} Tage
                    </Badge>
                  </td>
                  <td style={{ ...S.td, display: "flex", gap: 6 }}>
                    <button style={S.btnGreen}
                      disabled={busy === inv.invoice_number}
                      onClick={() => confirmPaid(inv.invoice_number)}>
                      ✅ Bezahlt
                    </button>
                    <button style={S.btn}
                      disabled={busy === "resend_" + inv.invoice_number}
                      onClick={() => resend(inv.invoice_number)}>
                      📧
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: NUTZER
// ══════════════════════════════════════════════════════════════════════════════
function UsersTab() {
  const [data, setData] = useState(null);
  useEffect(() => {
    adminFetch("/admin/analytics/users").then(setData).catch(() => setData(null));
  }, []);

  if (!data) return <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(240,236,227,0.3)" }}>Laden…</div>;

  return (
    <div>
      <div style={S.kpiGrid}>
        <KPICard icon={<Users size={15} />} label="Gesamt"       value={data.total} />
        <KPICard icon={<Activity size={15} />} label="Aktiv 7T"  value={data.active_this_week}  sub="Eingeloggt" />
        <KPICard icon={<Activity size={15} />} label="Aktiv 30T" value={data.active_this_month} sub="Eingeloggt" />
        <KPICard icon={<Users size={15} />} label="Neu 7T"       value={data.new_this_week}  sub="Registriert" />
        <KPICard icon={<Users size={15} />} label="Neu 30T"      value={data.new_this_month} sub="Registriert" />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {/* Lizenz-Breakdown Chart */}
        <div style={{ ...S.card, flex: 1, minWidth: 200 }}>
          <div style={S.sectionTitle}>Lizenz-Verteilung</div>
          <ProviderBarChart data={[
            { label: "Free",   value: data.by_license.free },
            { label: "Pro",    value: data.by_license.pro },
            { label: "Schule", value: data.by_license.schule },
          ]} />
        </div>

        {/* Quiz-Stats */}
        <div style={{ ...S.card, flex: 1, minWidth: 200 }}>
          <div style={S.sectionTitle}>Quiz-Aktivität</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#f0ece3" }}>{data.quizze_gesamt}</div>
              <div style={{ fontSize: 12, color: "rgba(240,236,227,0.4)" }}>Quizze gesamt</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#e8600a" }}>{data.lehrer_mit_quiz}</div>
              <div style={{ fontSize: 12, color: "rgba(240,236,227,0.4)" }}>Lehrer mit Quizzen</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const [kpis,    setKpis]    = useState(null);
  const [tab,     setTab]     = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setLoading(true); setError("");
    adminFetch("/admin/analytics/dashboard")
      .then(d => { setKpis(d); setLoading(false); })
      .catch(e => { setError(e.message || "Laden fehlgeschlagen"); setLoading(false); });
  }, [refresh]);

  const tabs = [
    { key: "overview",      label: "Übersicht" },
    { key: "transactions",  label: "Transaktionen" },
    { key: "invoices",      label: "Rechnungen" },
    { key: "users",         label: "Nutzer" },
  ];

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Crown size={18} color="#e8600a" />
          <span style={{ fontWeight: 800, fontSize: 16 }}>Admin Dashboard</span>
          <Badge color="orange">Analytics</Badge>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={S.btn} onClick={() => setRefresh(r => r + 1)} title="Aktualisieren">
            <RefreshCw size={13} />
          </button>
          <button style={S.btn} onClick={() => window.history.back()}>
            ← Zurück
          </button>
        </div>
      </div>

      <div style={S.container}>
        {error && (
          <div style={{
            background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)",
            borderRadius: 10, padding: "12px 16px", color: "#f87171", marginBottom: 20, fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,236,227,0.3)" }}>
            Daten werden geladen…
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Tab Navigation */}
            <div style={S.tabBar}>
              {tabs.map(t => (
                <Tab key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
                  {t.label}
                  {t.key === "invoices" && kpis?.invoices_pending?.count > 0 && (
                    <span style={{
                      marginLeft: 6, fontSize: 10, fontWeight: 700,
                      background: "#e8600a", color: "#fff",
                      borderRadius: "50%", width: 16, height: 16,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {kpis.invoices_pending.count}
                    </span>
                  )}
                </Tab>
              ))}
            </div>

            {tab === "overview"     && <OverviewTab kpis={kpis} onTabChange={setTab} />}
            {tab === "transactions" && <TransactionTab />}
            {tab === "invoices"     && <InvoiceTab />}
            {tab === "users"        && <UsersTab />}
          </>
        )}
      </div>
    </div>
  );
}
