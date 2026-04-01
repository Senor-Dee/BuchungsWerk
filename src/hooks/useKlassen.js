// ══════════════════════════════════════════════════════════════════════════════
// useKlassen – Klassen & Schüler CRUD mit Loading-State
// ══════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from "react";
import { getKlassen, klasseErstellen, klasseLöschen,
         getSchueler, schuelerErstellen, schuelerLöschen } from "../api/teacherApi.js";

export function useKlassen() {
  const [klassen, setKlassen]       = useState([]);
  const [schuelerMap, setSchuelerMap] = useState({}); // klasseId → []
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const ladeKlassen = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getKlassen();
      setKlassen(data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { ladeKlassen(); }, [ladeKlassen]);

  const ladeSchueler = useCallback(async (klasseId) => {
    try {
      const data = await getSchueler(klasseId);
      setSchuelerMap(prev => ({ ...prev, [klasseId]: data || [] }));
    } catch {}
  }, []);

  const klasseAnlegen = useCallback(async (name, stufe, schuljahr) => {
    const k = await klasseErstellen(name, stufe, schuljahr);
    await ladeKlassen();
    return k;
  }, [ladeKlassen]);

  const klasseEntfernen = useCallback(async (id) => {
    await klasseLöschen(id);
    setKlassen(prev => prev.filter(k => k.id !== id));
    setSchuelerMap(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, []);

  const schuelerAnlegen = useCallback(async (klasseId, vorname, nachname, kuerzel) => {
    const s = await schuelerErstellen(klasseId, vorname, nachname, kuerzel);
    await ladeSchueler(klasseId);
    return s;
  }, [ladeSchueler]);

  const schuelerEntfernen = useCallback(async (klasseId, schuelerId) => {
    await schuelerLöschen(schuelerId);
    setSchuelerMap(prev => ({
      ...prev,
      [klasseId]: (prev[klasseId] || []).filter(s => s.id !== schuelerId),
    }));
  }, []);

  return {
    klassen, schuelerMap, loading, error,
    ladeKlassen, ladeSchueler,
    klasseAnlegen, klasseEntfernen,
    schuelerAnlegen, schuelerEntfernen,
  };
}
