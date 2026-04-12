// ══════════════════════════════════════════════════════════════════════════════
// Teacher API – Live-Quiz Endpoints
// ══════════════════════════════════════════════════════════════════════════════
import { API_URL } from "../api.js";

function getToken() {
  try { return localStorage.getItem("bw_token"); } catch { return null; }
}

async function tFetch(path, method = "GET", body = null) {
  const token = getToken();
  const res = await fetch(API_URL + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = method === "DELETE" ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
  return data;
}

// ── Live-Quiz Lehrer ────────────────────────────────────────────────────────

export async function quizStarten(titel, aufgaben, klasseId = null) {
  return tFetch("/quiz/live/start", "POST", {
    titel,
    klasse_id: klasseId,
    aufgaben_json: JSON.stringify(aufgaben),
  });
}

export async function meineQuizze() {
  return tFetch("/quiz/live/meine");
}

export async function quizInfo(code) {
  return tFetch(`/quiz/live/${code.toUpperCase()}`);
}

export async function quizNaechsteFrage(code) {
  return tFetch(`/quiz/live/${code.toUpperCase()}/naechste`, "POST");
}

export async function quizStoppen(code) {
  return tFetch(`/quiz/live/${code.toUpperCase()}/stop`, "POST");
}

export async function quizErgebnisse(code) {
  return tFetch(`/quiz/live/${code.toUpperCase()}/ergebnisse`);
}

export async function quizLoeschen(code) {
  return tFetch(`/quiz/live/${code.toUpperCase()}`, "DELETE");
}

// ── Live-Quiz Schüler ────────────────────────────────────────────────────────

export async function quizJoinen(code, spieler) {
  const res = await fetch(API_URL + `/quiz/live/${code.toUpperCase()}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spieler }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
  return data; // { session_id, quiz_code, spieler }
}

export async function quizAntwort(code, sessionId, frageNr, antwortIdx, zeitMs) {
  const res = await fetch(API_URL + `/quiz/live/${code.toUpperCase()}/antwort`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, frage_nr: frageNr, antwort_idx: antwortIdx, zeit_ms: zeitMs }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
  return data;
}

// ── Klassen / Schüler ────────────────────────────────────────────────────────

export async function getKlassen() {
  return tFetch("/klassen");
}

export async function klasseErstellen(name, stufe, schuljahr) {
  return tFetch("/klassen", "POST", { name, stufe, schuljahr });
}

export async function klasseLöschen(id) {
  return tFetch(`/klassen/${id}`, "DELETE");
}

export async function getSchueler(klasseId) {
  return tFetch(`/klassen/${klasseId}/schueler`);
}

export async function schuelerErstellen(klasseId, vorname, nachname, kuerzel) {
  return tFetch("/schueler", "POST", { klasse_id: klasseId, vorname, nachname, kuerzel: kuerzel || null });
}

export async function schuelerLöschen(id) {
  return tFetch(`/schueler/${id}`, "DELETE");
}

export async function klassenStatistik(klasseId) {
  return tFetch(`/klassen/${klasseId}/statistik`);
}

// ── Lehrer-Statistik-Dashboard (Phase 2.3) ──────────────────────────────────

export async function classroomStats(klasseId) {
  return tFetch(`/teacher/classroom/${klasseId}/stats`);
}

export async function classroomLeaderboard(klasseId) {
  return tFetch(`/teacher/classroom/${klasseId}/leaderboard`);
}

export async function classroomAtRisk(klasseId) {
  return tFetch(`/teacher/classroom/${klasseId}/at-risk`);
}

export async function classroomTrends(klasseId) {
  return tFetch(`/teacher/classroom/${klasseId}/lernbereich-trends`);
}
