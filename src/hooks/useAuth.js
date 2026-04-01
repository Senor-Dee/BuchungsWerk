// ══════════════════════════════════════════════════════════════════════════════
// useAuth – liest den eingeloggten Lehrer aus localStorage
// ══════════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";

export function useAuth() {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("bw_user");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const [token, setToken] = useState(() => {
    try { return localStorage.getItem("bw_token"); } catch { return null; }
  });

  // Synchronisiert mit externen Änderungen (z.B. Login in anderem Tab)
  useEffect(() => {
    function onStorage(e) {
      if (e.key === "bw_user") {
        try { setUser(e.newValue ? JSON.parse(e.newValue) : null); } catch {}
      }
      if (e.key === "bw_token") {
        setToken(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { user, token, isLoggedIn: !!token && !!user };
}
