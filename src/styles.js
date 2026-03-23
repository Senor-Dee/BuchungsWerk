// ══════════════════════════════════════════════════════════════════════════════
// DESIGN-SYSTEM – zentrale Style-Objekte
// ══════════════════════════════════════════════════════════════════════════════
export const S = {
  page:        { minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", fontFamily: "'Segoe UI',system-ui,-apple-system,sans-serif", color: "#0f172a" },
  topbar:      { background: "#0f172a", padding: "0 20px", height: "62px", display: "flex", alignItems: "center", gap: "0", borderBottom: "2px solid #f59e0b", position: "sticky", top: 0, zIndex: 200 },
  logo:        { fontSize: "19px", fontWeight: 900, color: "#fff", cursor: "pointer", whiteSpace: "nowrap", minWidth: "160px", flexShrink: 0, letterSpacing: "-0.04em" },
  logoAccent:  { color: "#f59e0b" },
  container:   { flex: 1, width: "100%", maxWidth: "900px", margin: "0 auto", padding: "0", boxSizing: "border-box" },
  card:        { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "28px 24px", marginBottom: "16px", textAlign: "left", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  label:       { fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94a3b8", marginBottom: "10px" },
  h2:          { fontSize: "26px", fontWeight: 800, color: "#0f172a", marginBottom: "4px", letterSpacing: "-0.03em" },
  btnPrimary:  { padding: "14px 28px", background: "#0f172a", color: "#fff", border: "none", borderRadius: "12px", fontWeight: 700, fontSize: "15px", cursor: "pointer", minHeight: "48px" },
  btnSecondary:{ padding: "12px 20px", background: "#f1f5f9", color: "#475569", border: "1.5px solid #e2e8f0", borderRadius: "12px", fontWeight: 600, fontSize: "14px", cursor: "pointer", minHeight: "48px" },
  input:       { padding: "12px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "15px", outline: "none", boxSizing: "border-box", background: "#fff", color: "#0f172a", minHeight: "48px" },
  tag:         c => ({ display: "inline-block", padding: "4px 12px", background: c + "18", color: c, borderRadius: "20px", fontSize: "12px", fontWeight: 700, border: `1px solid ${c}33` }),
  // ── Utility-Styles ──
  muted:     { color: "#94a3b8" },
  sub:       { color: "#64748b" },
  subdued:   { color: "#475569" },
  hint:      { fontSize: "11px", color: "#6b7280" },
  bold:      { fontWeight: 700 },
  accent:    { color: "#f59e0b", fontWeight: 800 },
  right:     { textAlign: "right" },
  mb8:       { marginBottom: "8px" },
  badgeWarn: { background: "#fef3c7", color: "#92400e", borderRadius: "6px", padding: "2px 7px", fontWeight: 700 },
  badgeDark: { background: "#1e293b", color: "#fff",    borderRadius: "6px", padding: "2px 7px", fontWeight: 700 },
};
