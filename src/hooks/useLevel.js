// ══════════════════════════════════════════════════════════════════════════════
// useLevel – Lernbereich-Niveau (Backend-persistiert)
// ══════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from "react";
import { API_URL } from "../api.js";

async function fetchLevels(name) {
  try {
    const res = await fetch(`${API_URL}/level/${encodeURIComponent(name)}`);
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

async function postLevelRecord(name, lernbereich, korrektCount, gesamtCount, gesamtAufgaben) {
  try {
    const res = await fetch(`${API_URL}/level/record`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        lernbereich,
        korrekt_count:   korrektCount,
        gesamt_count:    gesamtCount,
        gesamt_aufgaben: gesamtAufgaben,
      }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export function useLevel(name) {
  const [levels,  setLevels]  = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!name) return;
    setLoading(true);
    const data = await fetchLevels(name);
    if (data) setLevels(data);
    setLoading(false);
  }, [name]);

  useEffect(() => { load(); }, [load]);

  const recordLevel = useCallback(async (lernbereich, korrektCount, gesamtCount, gesamtAufgaben = 50) => {
    if (!name || gesamtCount < 1) return null;
    const data = await postLevelRecord(name, lernbereich, korrektCount, gesamtCount, gesamtAufgaben);
    if (data) {
      setLevels(prev => {
        const idx = prev.findIndex(l => l.lernbereich === lernbereich);
        const updated = { ...data, lernbereich, schueler_name: name };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...prev[idx], ...updated };
          return next;
        }
        return [...prev, updated];
      });
    }
    return data;
  }, [name]);

  return { levels, loading, recordLevel };
}
