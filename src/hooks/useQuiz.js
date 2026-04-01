// ══════════════════════════════════════════════════════════════════════════════
// useQuiz – Live-Quiz Polling (2 s) für Lehrer-Dashboard
// ══════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from "react";
import { quizInfo, quizErgebnisse, quizNaechsteFrage, quizStoppen } from "../api/teacherApi.js";

const POLL_MS = 2000;

export function useQuiz(code) {
  const [quiz,      setQuiz]      = useState(null);
  const [ergebnisse, setErgebnisse] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const timerRef = useRef(null);

  const poll = useCallback(async () => {
    if (!code) return;
    // Quiz-State und Ergebnisse getrennt fetchen:
    // Ein Auth-Fehler bei /ergebnisse darf den Quiz-State-Update nicht blockieren
    try {
      const q = await quizInfo(code);
      setQuiz(q);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    try {
      const e = await quizErgebnisse(code);
      setErgebnisse(e || []);
    } catch {}
  }, [code]);

  // Sofort laden, dann alle 2 s
  useEffect(() => {
    if (!code) return;
    setLoading(true);
    poll().finally(() => setLoading(false));
    timerRef.current = setInterval(poll, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [code, poll]);

  const naechsteFrage = useCallback(async () => {
    if (!code) return;
    await quizNaechsteFrage(code);
    await poll();
  }, [code, poll]);

  const stoppeQuiz = useCallback(async () => {
    if (!code) return;
    await quizStoppen(code);
    await poll();
  }, [code, poll]);

  return { quiz, ergebnisse, loading, error, naechsteFrage, stoppeQuiz };
}

// ── Schüler-seitiges Polling ──────────────────────────────────────────────────
export function useQuizSchueler(code) {
  const [quiz,    setQuiz]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const timerRef = useRef(null);

  const poll = useCallback(async () => {
    if (!code) return;
    try {
      const q = await quizInfo(code);
      setQuiz(q);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [code]);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    poll().finally(() => setLoading(false));
    timerRef.current = setInterval(poll, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [code, poll]);

  return { quiz, loading, error };
}
