// ══════════════════════════════════════════════════════════════════════════════
// ErrorBoundary – React-Fehlergrenze
// ══════════════════════════════════════════════════════════════════════════════
import React from "react";
import { AlertTriangle, CheckSquare, Zap, RefreshCw } from "lucide-react";
import { API_URL } from "../api.js";

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null, gemeldet: false }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    console.error("BuchungsWerk Fehler:", error, info);
    const text = `Fehler: ${error.message}\n\nStack:\n${error.stack}\n\nKomponenten-Stack:\n${info.componentStack}`;
    fetch(API_URL + "/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typ: "bug", text, ts: new Date().toISOString() }),
    })
      .then(() => this.setState({ gemeldet: true }))
      .catch(() => {});
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "40px", fontFamily: "Arial", maxWidth: "600px", margin: "40px auto" }}>
          <div style={{ background: "#fef2f2", border: "2px solid #dc2626", borderRadius: "12px", padding: "24px" }}>
            <div style={{ fontSize: "24px", marginBottom: "12px", display:"flex", alignItems:"center", gap:8 }}><AlertTriangle size={22} color="#dc2626"/>BuchungsWerk – Fehler</div>
            <div style={{ fontFamily: "monospace", fontSize: "13px", color: "#7f1d1d", background: "#fee2e2", padding: "12px", borderRadius: "8px", marginBottom: "16px", wordBreak: "break-all" }}>
              {this.state.error.message}
            </div>
            {this.state.gemeldet
              ? <div style={{ fontSize: "13px", color: "#15803d", marginBottom: "12px", display:"flex", alignItems:"center", gap:5 }}><CheckSquare size={13} strokeWidth={1.5}/>Fehler wurde automatisch an den Entwickler gemeldet.</div>
              : <div style={{ fontSize: "13px", color: "#92400e", marginBottom: "12px", display:"flex", alignItems:"center", gap:4 }}><Zap size={13}/>Fehler wird gemeldet…</div>
            }
            <button onClick={() => { this.setState({ error: null, gemeldet: false }); window.location.reload(); }}
              style={{ background: "#dc2626", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "14px", display:"flex", alignItems:"center", gap:7 }}>
              <RefreshCw size={14} strokeWidth={1.5}/>Neu laden
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
