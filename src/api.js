// ══════════════════════════════════════════════════════════════════════════════
// BACKEND-API
// ══════════════════════════════════════════════════════════════════════════════
export const API_URL = "https://api.buchungswerk.org";

export async function apiFetch(path, method = "GET", body = null, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(API_URL + path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return method === "DELETE" ? null : res.json();
  } catch (e) {
    console.warn("BuchungsWerk API:", e.name === "AbortError" ? `Timeout nach ${timeoutMs}ms (${path})` : e.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
