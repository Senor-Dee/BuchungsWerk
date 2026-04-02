// ══════════════════════════════════════════════════════════════════════════════
// BACKEND-API
// ══════════════════════════════════════════════════════════════════════════════
export const API_URL = "https://api.buchungswerk.org";

function getToken() {
  try { return localStorage.getItem("bw_token"); } catch { return null; }
}

export async function apiFetch(path, method = "GET", body = null, timeoutMs = 10000, throwOnError = false) {
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
    const msg = e.name === "AbortError" ? `Timeout nach ${timeoutMs}ms (${path})` : e.message;
    console.warn("BuchungsWerk API:", msg);
    if (throwOnError) throw new Error(msg);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
