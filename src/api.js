// ══════════════════════════════════════════════════════════════════════════════
// BACKEND-API
// ══════════════════════════════════════════════════════════════════════════════
export const API_URL = "https://api.buchungswerk.org";

function getToken() {
  try { return localStorage.getItem("bw_token"); } catch { return null; }
}

/**
 * Gibt einen user-scoped localStorage-Key zurück.
 * buchungswerk_belege → buchungswerk_belege_u42  (für user id=42)
 * Verhindert, dass verschiedene Nutzer am selben Gerät elkaindere Daten sehen.
 */
export function userKey(key) {
  try {
    const u = JSON.parse(localStorage.getItem("bw_user") || "null");
    if (u?.id) return `${key}_u${u.id}`;
  } catch {}
  return key; // nicht eingeloggt – kein Scoping möglich
}

export async function apiFetch(path, method = "GET", body = null, timeoutMs = 12000, throwOnError = false) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const token = getToken();
  try {
    const res = await fetch(API_URL + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return method === "DELETE" ? null : res.json();
  } catch (e) {
    let msg;
    if (e.name === "AbortError") {
      msg = `Timeout nach ${timeoutMs}ms (${path})`;
    } else if (e instanceof TypeError && (e.message === "Load failed" || e.message === "Failed to fetch" || e.message === "NetworkError when attempting to fetch resource.")) {
      // iOS Safari gibt "Load failed" bei Netzwerkfehlern – deutschen Text zeigen
      msg = "Keine Verbindung zum Server. Bitte Internetverbindung prüfen.";
    } else {
      msg = e.message;
    }
    console.warn("BuchungsWerk API:", msg, path);
    if (throwOnError) throw new Error(msg);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
