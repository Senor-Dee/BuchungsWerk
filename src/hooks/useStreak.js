// ══════════════════════════════════════════════════════════════════════════════
// useStreak – Schüler-Streak (Backend-persistiert)
// ══════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from "react";
import { API_URL } from "../api.js";

async function fetchStreak(name) {
  try {
    const res = await fetch(`${API_URL}/streak/${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function postRecord(name, quizCode) {
  try {
    const res = await fetch(`${API_URL}/streak/record`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, quiz_code: quizCode ?? null }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export function useStreak(name) {
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!name) return;
    setLoading(true);
    const data = await fetchStreak(name);
    if (data) setStreak(data);
    setLoading(false);
  }, [name]);

  useEffect(() => { load(); }, [load]);

  const recordCompletion = useCallback(async (quizCode = null) => {
    if (!name) return null;
    const data = await postRecord(name, quizCode);
    if (data) setStreak(data);
    return data;
  }, [name]);

  return { streak, loading, recordCompletion };
}
