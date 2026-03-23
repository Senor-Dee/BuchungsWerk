"""
BuchungsWerk Backend – FastAPI + SQLite
Raspberry Pi / Home Server
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import sqlite3, json, os
from datetime import datetime
import httpx

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="BuchungsWerk API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Im LAN unbedenklich; für Prod einschränken
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.environ.get("BW_DB", "buchungswerk.db")

# ── DB-Setup ───────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS klassen (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        name      TEXT NOT NULL UNIQUE,          -- z.B. "8b"
        stufe     INTEGER NOT NULL,              -- 7–10
        schuljahr TEXT NOT NULL,                 -- z.B. "2025/26"
        erstellt  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schueler (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        klasse_id INTEGER NOT NULL REFERENCES klassen(id) ON DELETE CASCADE,
        vorname   TEXT NOT NULL,
        nachname  TEXT NOT NULL,
        kuerzel   TEXT,                          -- optional: anonymes Kürzel
        erstellt  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quiz_sessions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        klasse_id   INTEGER REFERENCES klassen(id) ON DELETE SET NULL,
        schueler_id INTEGER REFERENCES schueler(id) ON DELETE SET NULL,
        titel       TEXT,
        klasse_stufe INTEGER,
        pruefungsart TEXT,
        config_json TEXT,                        -- vollst. Quiz-Config als JSON
        gestartet   TEXT DEFAULT (datetime('now')),
        beendet     TEXT
    );

    CREATE TABLE IF NOT EXISTS ergebnisse (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id  INTEGER NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
        frage_nr    TEXT NOT NULL,               -- z.B. "1", "2a", "3★"
        frage_typ   TEXT,                        -- drag_konten, single_choice, …
        punkte      INTEGER DEFAULT 0,
        max_punkte  INTEGER DEFAULT 0,
        korrekt     INTEGER DEFAULT 0,           -- 0/1
        antwort_json TEXT,                       -- Schülerantwort als JSON
        erstellt    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS materialien (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        titel          TEXT NOT NULL,
        jahrgangsstufe INTEGER NOT NULL,
        typ            TEXT NOT NULL,
        pruefungsart   TEXT,
        firma_name     TEXT,
        firma_icon     TEXT,
        gesamt_punkte  INTEGER DEFAULT 0,
        daten_json     TEXT NOT NULL,
        erstellt       TEXT DEFAULT (datetime('now')),
        geaendert      TEXT DEFAULT (datetime('now'))
    );
    """)
    conn.commit()
    conn.close()

init_db()

# ── Pydantic-Schemas ───────────────────────────────────────────────────────────
class KlasseCreate(BaseModel):
    name: str
    stufe: int
    schuljahr: str

class SchuelerCreate(BaseModel):
    klasse_id: int
    vorname: str
    nachname: str
    kuerzel: Optional[str] = None

class SessionCreate(BaseModel):
    klasse_id: Optional[int] = None
    schueler_id: Optional[int] = None
    titel: Optional[str] = None
    klasse_stufe: Optional[int] = None
    pruefungsart: Optional[str] = None
    config_json: Optional[str] = None

class ErgebnisCreate(BaseModel):
    session_id: int
    frage_nr: str
    frage_typ: Optional[str] = None
    punkte: int = 0
    max_punkte: int = 0
    korrekt: bool = False
    antwort_json: Optional[str] = None

class SessionAbschluss(BaseModel):
    session_id: int

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "service": "BuchungsWerk API", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "ok", "db": DB_PATH, "time": datetime.now().isoformat()}

# ── Klassen ───────────────────────────────────────────────────────────────────
@app.get("/klassen")
def list_klassen(db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute("SELECT * FROM klassen ORDER BY stufe, name").fetchall()
    return [dict(r) for r in rows]

@app.post("/klassen", status_code=201)
def create_klasse(data: KlasseCreate, db: sqlite3.Connection = Depends(get_db)):
    try:
        cur = db.execute(
            "INSERT INTO klassen (name, stufe, schuljahr) VALUES (?, ?, ?)",
            (data.name, data.stufe, data.schuljahr)
        )
        db.commit()
        return {"id": cur.lastrowid, **data.dict()}
    except sqlite3.IntegrityError:
        raise HTTPException(400, f"Klasse '{data.name}' existiert bereits")

@app.delete("/klassen/{id}", status_code=204)
def delete_klasse(id: int, db: sqlite3.Connection = Depends(get_db)):
    db.execute("DELETE FROM klassen WHERE id = ?", (id,))
    db.commit()

# ── Schüler ───────────────────────────────────────────────────────────────────
@app.get("/klassen/{klasse_id}/schueler")
def list_schueler(klasse_id: int, db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute(
        "SELECT * FROM schueler WHERE klasse_id = ? ORDER BY nachname, vorname",
        (klasse_id,)
    ).fetchall()
    return [dict(r) for r in rows]

@app.post("/schueler", status_code=201)
def create_schueler(data: SchuelerCreate, db: sqlite3.Connection = Depends(get_db)):
    cur = db.execute(
        "INSERT INTO schueler (klasse_id, vorname, nachname, kuerzel) VALUES (?, ?, ?, ?)",
        (data.klasse_id, data.vorname, data.nachname, data.kuerzel)
    )
    db.commit()
    return {"id": cur.lastrowid, **data.dict()}

@app.delete("/schueler/{id}", status_code=204)
def delete_schueler(id: int, db: sqlite3.Connection = Depends(get_db)):
    db.execute("DELETE FROM schueler WHERE id = ?", (id,))
    db.commit()

# ── Quiz-Sessions ──────────────────────────────────────────────────────────────
@app.post("/sessions", status_code=201)
def create_session(data: SessionCreate, db: sqlite3.Connection = Depends(get_db)):
    cur = db.execute(
        """INSERT INTO quiz_sessions
           (klasse_id, schueler_id, titel, klasse_stufe, pruefungsart, config_json)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (data.klasse_id, data.schueler_id, data.titel,
         data.klasse_stufe, data.pruefungsart, data.config_json)
    )
    db.commit()
    return {"id": cur.lastrowid, "gestartet": datetime.now().isoformat()}

@app.post("/sessions/{id}/abschliessen")
def session_abschliessen(id: int, db: sqlite3.Connection = Depends(get_db)):
    db.execute(
        "UPDATE quiz_sessions SET beendet = datetime('now') WHERE id = ?", (id,)
    )
    db.commit()
    return {"ok": True}

@app.get("/sessions/{id}/zusammenfassung")
def session_zusammenfassung(id: int, db: sqlite3.Connection = Depends(get_db)):
    session = db.execute("SELECT * FROM quiz_sessions WHERE id = ?", (id,)).fetchone()
    if not session:
        raise HTTPException(404, "Session nicht gefunden")
    ergebnisse = db.execute(
        "SELECT * FROM ergebnisse WHERE session_id = ? ORDER BY rowid",
        (id,)
    ).fetchall()
    gesamt_p = sum(r["punkte"] for r in ergebnisse)
    gesamt_max = sum(r["max_punkte"] for r in ergebnisse)
    return {
        "session": dict(session),
        "ergebnisse": [dict(r) for r in ergebnisse],
        "gesamt_punkte": gesamt_p,
        "gesamt_max": gesamt_max,
        "prozent": round(gesamt_p / gesamt_max * 100, 1) if gesamt_max else 0,
    }

# ── Ergebnisse ────────────────────────────────────────────────────────────────
@app.post("/ergebnisse", status_code=201)
def create_ergebnis(data: ErgebnisCreate, db: sqlite3.Connection = Depends(get_db)):
    cur = db.execute(
        """INSERT INTO ergebnisse
           (session_id, frage_nr, frage_typ, punkte, max_punkte, korrekt, antwort_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (data.session_id, data.frage_nr, data.frage_typ,
         data.punkte, data.max_punkte, int(data.korrekt), data.antwort_json)
    )
    db.commit()
    return {"id": cur.lastrowid}

# ── Klassenstatistik ──────────────────────────────────────────────────────────
@app.get("/klassen/{klasse_id}/statistik")
def klassen_statistik(klasse_id: int, db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute("""
        SELECT s.vorname, s.nachname, s.kuerzel,
               COUNT(DISTINCT qs.id) as quiz_count,
               SUM(e.punkte) as gesamt_punkte,
               SUM(e.max_punkte) as gesamt_max,
               ROUND(AVG(CASE WHEN e.max_punkte > 0 THEN
                   CAST(e.punkte AS REAL) / e.max_punkte * 100 END), 1) as avg_pct
        FROM schueler s
        LEFT JOIN quiz_sessions qs ON qs.schueler_id = s.id
        LEFT JOIN ergebnisse e ON e.session_id = qs.id
        WHERE s.klasse_id = ?
        GROUP BY s.id
        ORDER BY s.nachname, s.vorname
    """, (klasse_id,)).fetchall()
    return [dict(r) for r in rows]

# ── Materialien ────────────────────────────────────────────────────────────────
class MaterialCreate(BaseModel):
    titel: str
    jahrgangsstufe: int
    typ: str
    pruefungsart: Optional[str] = None
    firma_name: Optional[str] = None
    firma_icon: Optional[str] = None
    gesamt_punkte: int = 0
    daten_json: str

@app.get("/materialien")
def list_materialien(stufe: Optional[int] = None, db: sqlite3.Connection = Depends(get_db)):
    if stufe:
        rows = db.execute(
            "SELECT id, titel, jahrgangsstufe, typ, pruefungsart, firma_name, firma_icon, gesamt_punkte, erstellt FROM materialien WHERE jahrgangsstufe = ? ORDER BY erstellt DESC",
            (stufe,)
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT id, titel, jahrgangsstufe, typ, pruefungsart, firma_name, firma_icon, gesamt_punkte, erstellt FROM materialien ORDER BY jahrgangsstufe, erstellt DESC"
        ).fetchall()
    return [dict(r) for r in rows]

@app.get("/materialien/{id}")
def get_material(id: int, db: sqlite3.Connection = Depends(get_db)):
    row = db.execute("SELECT * FROM materialien WHERE id = ?", (id,)).fetchone()
    if not row:
        raise HTTPException(404, "Material nicht gefunden")
    return dict(row)

@app.post("/materialien", status_code=201)
def create_material(data: MaterialCreate, db: sqlite3.Connection = Depends(get_db)):
    cur = db.execute(
        """INSERT INTO materialien (titel, jahrgangsstufe, typ, pruefungsart, firma_name, firma_icon, gesamt_punkte, daten_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (data.titel, data.jahrgangsstufe, data.typ, data.pruefungsart,
         data.firma_name, data.firma_icon, data.gesamt_punkte, data.daten_json)
    )
    db.commit()
    return {"id": cur.lastrowid, "erstellt": datetime.now().isoformat()}

@app.put("/materialien/{id}")
def update_material(id: int, data: MaterialCreate, db: sqlite3.Connection = Depends(get_db)):
    db.execute(
        """UPDATE materialien SET titel=?, jahrgangsstufe=?, typ=?, pruefungsart=?, firma_name=?,
           firma_icon=?, gesamt_punkte=?, daten_json=?, geaendert=datetime('now') WHERE id=?""",
        (data.titel, data.jahrgangsstufe, data.typ, data.pruefungsart,
         data.firma_name, data.firma_icon, data.gesamt_punkte, data.daten_json, id)
    )
    db.commit()
    return {"ok": True}

@app.delete("/materialien/{id}", status_code=204)
def delete_material(id: int, db: sqlite3.Connection = Depends(get_db)):
    db.execute("DELETE FROM materialien WHERE id = ?", (id,))
    db.commit()


# ── KI-Proxy (Anthropic) ───────────────────────────────────────────────────────
class KiBuchungRequest(BaseModel):
    prompt: str
    max_tokens: Optional[int] = 1000

@app.post("/ki/buchung")
async def ki_buchung(data: KiBuchungRequest):
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(500, "ANTHROPIC_API_KEY nicht gesetzt")
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            },
            json={
                "model": "claude-sonnet-4-20250514",
                "max_tokens": data.max_tokens,
                "messages": [{"role": "user", "content": data.prompt}],
            },
        )
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"Anthropic API Fehler: {resp.text}")
    return resp.json()


# ── PDF-Konvertierung (DOCX → PDF via LibreOffice) ────────────────────────────
import subprocess, tempfile, shutil
from fastapi import Request
from fastapi.responses import Response

@app.post("/convert/pdf")
async def convert_docx_to_pdf(request: Request):
    """Nimmt DOCX-Bytes entgegen, konvertiert via LibreOffice zu PDF."""
    docx_bytes = await request.body()
    if not docx_bytes:
        raise HTTPException(400, "Kein DOCX-Inhalt")

    # Prüfe ob LibreOffice/soffice verfügbar
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice:
        raise HTTPException(503, "LibreOffice nicht installiert (soffice nicht gefunden)")

    with tempfile.TemporaryDirectory() as tmpdir:
        docx_path = os.path.join(tmpdir, "input.docx")
        pdf_path  = os.path.join(tmpdir, "input.pdf")

        with open(docx_path, "wb") as f:
            f.write(docx_bytes)

        result = subprocess.run(
            [soffice, "--headless", "--convert-to", "pdf", "--outdir", tmpdir, docx_path],
            capture_output=True, text=True, timeout=60
        )

        if result.returncode != 0 or not os.path.exists(pdf_path):
            raise HTTPException(500, f"Konvertierung fehlgeschlagen: {result.stderr[:300]}")

        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=export.pdf"}
    )


# ── Support-Feedback (→ E-Mail via Resend.com) ───────────────────────────────
import base64

class SupportRequest(BaseModel):
    typ: str
    text: str
    dateiBase64: Optional[str] = None
    dateiName: Optional[str] = None
    ts: Optional[str] = None

@app.get("/support/test")
async def support_test():
    return {
        "resend_api_key_set": bool(os.environ.get("RESEND_API_KEY", "")),
        "support_mail": os.environ.get("SUPPORT_MAIL", "NICHT GESETZT"),
    }

@app.post("/support")
async def support_feedback(data: SupportRequest):
    api_key  = os.environ.get("RESEND_API_KEY", "")
    mail_to  = os.environ.get("SUPPORT_MAIL", "")

    if not api_key:
        print(f"[SUPPORT] {data.ts} [{data.typ}] {data.text}")
        return {"ok": True, "mode": "log"}

    typ_labels = {"bug": "🐛 Fehler", "idee": "💡 Idee", "lob": "👍 Lob"}
    label = typ_labels.get(data.typ, data.typ)

    html = f"""<h2>BuchungsWerk Feedback: {label}</h2>
<p><strong>Zeitpunkt:</strong> {data.ts or "-"}</p>
<p><strong>Typ:</strong> {label}</p>
<hr>
<p>{data.text.replace(chr(10), "<br>")}</p>"""

    payload = {
        "from": "BuchungsWerk <onboarding@resend.dev>",
        "to": [mail_to],
        "subject": f"BuchungsWerk Feedback: {label}",
        "html": html,
    }

    # Anhang falls vorhanden
    if data.dateiBase64 and data.dateiName:
        try:
            _, encoded = data.dateiBase64.split(",", 1)
            payload["attachments"] = [{"filename": data.dateiName, "content": encoded}]
        except Exception as e:
            print(f"Anhang-Fehler: {e}")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(500, f"Resend-Fehler: {resp.status_code} {resp.text}")

    return {"ok": True}
