// ══════════════════════════════════════════════════════════════════════════════
// DESIGN-SYSTEM – Gusswerk Dark Glass
// Palette: Cast-Iron Black #141008 · Molten Orange #e8600a · Bone #f0ece3
// Fonts: Bebas Neue (Display) · IBM Plex Sans (Body) · Fira Code (Zahlen)
// ══════════════════════════════════════════════════════════════════════════════
export const S = {
  page:        { minHeight: "100vh", display: "flex", flexDirection: "column", background: "#141008", fontFamily: "'IBM Plex Sans',system-ui,-apple-system,sans-serif", color: "#f0ece3" },
  topbar:      { background: "rgba(14,10,4,0.50)", backdropFilter: "blur(18px) saturate(150%)", WebkitBackdropFilter: "blur(18px) saturate(150%)", padding: "0 20px", height: "62px", display: "flex", alignItems: "center", gap: "0", borderBottom: "2px solid #e8600a", position: "sticky", top: 0, zIndex: 200 },
  logo:        { fontFamily: "'Bebas Neue', system-ui, sans-serif", fontSize: "22px", fontWeight: 400, letterSpacing: "0.06em", color: "#f0ece3", cursor: "pointer", whiteSpace: "nowrap", minWidth: "160px", flexShrink: 0 },
  logoAccent:  { color: "#e8600a" },
  container:   { flex: 1, width: "100%", maxWidth: "900px", margin: "0 auto", padding: "0", boxSizing: "border-box" },
  card:        { background: "rgba(28,20,10,0.58)", backdropFilter: "blur(20px) saturate(130%)", WebkitBackdropFilter: "blur(20px) saturate(130%)", border: "1px solid rgba(240,236,227,0.1)", borderLeft: "3px solid #e8600a", borderRadius: "14px", padding: "28px 24px", marginBottom: "16px", textAlign: "left", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" },
  label:       { fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(240,236,227,0.5)", marginBottom: "10px", fontFamily: "'IBM Plex Sans',system-ui,sans-serif" },
  h2:          { fontFamily: "'Bebas Neue', system-ui, sans-serif", fontSize: "28px", fontWeight: 400, letterSpacing: "0.04em", color: "#f0ece3", marginBottom: "4px" },
  btnPrimary:  { padding: "14px 28px", background: "linear-gradient(180deg, #f07320 0%, #e8600a 55%, #c24f08 100%)", color: "#f0ece3", border: "1px solid rgba(255,170,60,0.25)", borderRadius: "10px", fontWeight: 700, fontSize: "15px", cursor: "pointer", minHeight: "48px", transition: "all 180ms ease", fontFamily: "'IBM Plex Sans',system-ui,sans-serif", boxShadow: "0 3px 0 rgba(0,0,0,0.5), 0 0 18px rgba(232,96,10,0.35), inset 0 1px 0 rgba(255,200,80,0.18)" },
  btnSecondary:{ padding: "12px 20px", background: "rgba(240,236,227,0.07)", backdropFilter: "none", WebkitBackdropFilter: "none", color: "#f0ece3", border: "1px solid rgba(240,236,227,0.15)", borderRadius: "10px", fontWeight: 600, fontSize: "14px", cursor: "pointer", minHeight: "48px", transition: "all 220ms cubic-bezier(0.16,1,0.3,1)", fontFamily: "'IBM Plex Sans',system-ui,sans-serif", boxShadow: "inset 2px 2px 0.5px -2px rgba(255,255,255,0.28), inset -2px -2px 0.5px -2px rgba(255,255,255,0.12), 0 1px 3px rgba(0,0,0,0.30)" },
  input:       { padding: "12px 14px", border: "1.5px solid rgba(240,236,227,0.18)", borderRadius: "10px", fontSize: "15px", outline: "none", boxSizing: "border-box", background: "rgba(240,236,227,0.06)", color: "#f0ece3", minHeight: "48px", transition: "border-color 200ms ease, box-shadow 200ms ease", fontFamily: "'IBM Plex Sans',system-ui,sans-serif" },
  tag:         c => ({ display: "inline-block", padding: "4px 12px", background: c + "22", color: c, borderRadius: "20px", fontSize: "12px", fontWeight: 700, border: `1px solid ${c}55` }),
  // ── Utility-Styles ──
  muted:     { color: "rgba(240,236,227,0.45)" },
  sub:       { color: "rgba(240,236,227,0.6)" },
  subdued:   { color: "rgba(240,236,227,0.7)" },
  hint:      { fontSize: "11px", color: "rgba(240,236,227,0.4)" },
  bold:      { fontWeight: 700 },
  accent:    { color: "#e8600a", fontWeight: 800 },
  right:     { textAlign: "right" },
  mb8:       { marginBottom: "8px" },
  badgeWarn: { background: "rgba(232,96,10,0.18)", color: "#f0c090", borderRadius: "6px", padding: "2px 7px", fontWeight: 700 },
  badgeDark: { background: "rgba(240,236,227,0.12)", color: "#f0ece3", borderRadius: "6px", padding: "2px 7px", fontWeight: 700 },
  // ── Zahlen-Font (Buchhaltung) ──
  mono:      { fontFamily: "'Fira Code', 'IBM Plex Mono', monospace" },

  // ── Liquid Glass – neue Varianten (bestehende Buttons bleiben erhalten) ──
  btnGlass: {
    position: 'relative', overflow: 'hidden',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
    padding: '11px 26px', borderRadius: '999px',
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.02em',
    border: '1px solid rgba(232,96,10,0.4)', background: 'rgba(232,96,10,0.14)',
    color: '#e8600a', cursor: 'pointer',
    transition: 'all 0.4s cubic-bezier(0.23,1,0.32,1)',
    filter: 'url(#lg-btn)',
  },
  btnGlassSolid: {
    position: 'relative', overflow: 'hidden',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '13px 36px', borderRadius: '999px',
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    fontSize: '0.95rem', fontWeight: 700,
    border: 'none',
    background: 'linear-gradient(180deg, #f07320 0%, #e8600a 55%, #c24f08 100%)',
    color: '#f0ece3', cursor: 'pointer',
    transition: 'all 0.4s cubic-bezier(0.23,1,0.32,1)',
    boxShadow: '0 3px 0 rgba(0,0,0,0.5), 0 0 28px rgba(232,96,10,0.35)',
  },

  // ── Premium Glass Card (Top-Highlight-Linie orange) ──
  cardGlass: {
    background: 'rgba(28,20,10,0.58)',
    backdropFilter: 'blur(24px) saturate(130%)', WebkitBackdropFilter: 'blur(24px) saturate(130%)',
    border: '1px solid rgba(240,236,227,0.1)',
    borderTop: '1px solid rgba(232,96,10,0.35)',
    borderRadius: '14px', padding: '28px 24px', marginBottom: '16px',
    textAlign: 'left',
    boxShadow: '0 4px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(232,96,10,0.08)',
    position: 'relative', overflow: 'hidden',
  },
};
