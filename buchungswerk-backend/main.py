"""
BuchungsWerk Backend – FastAPI + SQLite + JWT-Auth
Raspberry Pi / Home Server
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import sqlite3, os, secrets, random, string
from datetime import datetime, timedelta, timezone, date

import bcrypt
import jwt
import pyotp
import httpx

# ── Config ─────────────────────────────────────────────────────────────────────
JWT_SECRET      = os.environ.get("BW_JWT_SECRET", "change-me-in-production")
JWT_ALGO        = "HS256"
JWT_EXPIRE_DAYS = 7
RESEND_KEY      = os.environ.get("RESEND_API_KEY", "")
FROM_EMAIL      = os.environ.get("BW_FROM_EMAIL", "BuchungsWerk <noreply@buchungswerk.org>")
APP_URL         = os.environ.get("BW_APP_URL", "https://buchungswerk.org")
DB_PATH         = os.environ.get("BW_DB", "buchungswerk.db")
REQUIRE_VERIFY  = os.environ.get("BW_REQUIRE_VERIFY", "true").lower() == "true" and bool(RESEND_KEY)
ANTHROPIC_KEY   = os.environ.get("BW_ANTHROPIC_KEY", "")

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="BuchungsWerk API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://buchungswerk.org", "https://www.buchungswerk.org", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security_scheme = HTTPBearer(auto_error=False)

# ── DB ─────────────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS klassen (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        name      TEXT NOT NULL UNIQUE,
        stufe     INTEGER NOT NULL,
        schuljahr TEXT NOT NULL,
        erstellt  TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS schueler (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        klasse_id INTEGER NOT NULL REFERENCES klassen(id) ON DELETE CASCADE,
        vorname   TEXT NOT NULL,
        nachname  TEXT NOT NULL,
        kuerzel   TEXT,
        erstellt  TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS quiz_sessions (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        klasse_id    INTEGER REFERENCES klassen(id) ON DELETE SET NULL,
        schueler_id  INTEGER REFERENCES schueler(id) ON DELETE SET NULL,
        titel        TEXT,
        klasse_stufe INTEGER,
        pruefungsart TEXT,
        config_json  TEXT,
        gestartet    TEXT DEFAULT (datetime('now')),
        beendet      TEXT
    );
    CREATE TABLE IF NOT EXISTS ergebnisse (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id   INTEGER NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
        frage_nr     TEXT NOT NULL,
        frage_typ    TEXT,
        punkte       INTEGER DEFAULT 0,
        max_punkte   INTEGER DEFAULT 0,
        korrekt      INTEGER DEFAULT 0,
        antwort_json TEXT,
        erstellt     TEXT DEFAULT (datetime('now'))
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
    CREATE TABLE IF NOT EXISTS spielrangliste (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        session_code TEXT NOT NULL,
        spieler      TEXT NOT NULL,
        punkte       INTEGER DEFAULT 0,
        max_punkte   INTEGER DEFAULT 0,
        zeit         INTEGER DEFAULT 0,
        klasse       TEXT,
        ts           TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS support_logs (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        typ      TEXT,
        text     TEXT,
        ts       TEXT,
        erstellt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS users (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        vorname        TEXT NOT NULL DEFAULT '',
        nachname       TEXT NOT NULL DEFAULT '',
        email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
        schule         TEXT NOT NULL DEFAULT '',
        passwort_hash  TEXT NOT NULL,
        is_admin       INTEGER NOT NULL DEFAULT 0,
        ist_aktiv      INTEGER NOT NULL DEFAULT 1,
        email_verified INTEGER NOT NULL DEFAULT 0,
        totp_secret    TEXT,
        totp_enabled   INTEGER NOT NULL DEFAULT 0,
        letzter_login  TEXT,
        lizenz_typ     TEXT NOT NULL DEFAULT 'free',
        lizenz_bis     TEXT,
        notiz          TEXT NOT NULL DEFAULT '',
        erstellt       TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS token_store (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token      TEXT NOT NULL,
        typ        TEXT NOT NULL,
        abgelaufen TEXT NOT NULL,
        verwendet  INTEGER DEFAULT 0,
        erstellt   TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS session_aktiv (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        session_code TEXT NOT NULL,
        spieler      TEXT NOT NULL,
        klasse       TEXT,
        spielstand   TEXT,
        ts           TEXT DEFAULT (datetime('now')),
        UNIQUE(session_code, spieler)
    );
    CREATE TABLE IF NOT EXISTS session_kontrolle (
        session_code TEXT PRIMARY KEY,
        end_in       INTEGER DEFAULT 0,
        ts           TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS live_quizze (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        code          TEXT NOT NULL UNIQUE,
        lehrer_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
        titel         TEXT NOT NULL DEFAULT 'Live-Quiz',
        klasse_id     INTEGER REFERENCES klassen(id) ON DELETE SET NULL,
        aufgaben_json TEXT NOT NULL DEFAULT '[]',
        status        TEXT NOT NULL DEFAULT 'laufend',
        frage_nr      INTEGER NOT NULL DEFAULT 0,
        gestartet     TEXT DEFAULT (datetime('now')),
        beendet       TEXT
    );
    CREATE TABLE IF NOT EXISTS live_quiz_antworten (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_code   TEXT NOT NULL,
        spieler     TEXT NOT NULL,
        frage_nr    INTEGER NOT NULL,
        antwort_idx INTEGER,
        korrekt     INTEGER DEFAULT 0,
        punkte      INTEGER DEFAULT 0,
        ts          TEXT DEFAULT (datetime('now')),
        UNIQUE(quiz_code, spieler, frage_nr)
    );
    CREATE TABLE IF NOT EXISTS schueler_streaks (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        schueler_name        TEXT NOT NULL,
        quiz_code            TEXT,
        current_streak       INTEGER NOT NULL DEFAULT 0,
        max_streak           INTEGER NOT NULL DEFAULT 0,
        last_completion_date TEXT,
        erstellt             TEXT DEFAULT (datetime('now')),
        aktualisiert         TEXT DEFAULT (datetime('now')),
        UNIQUE(schueler_name)
    );
    CREATE TABLE IF NOT EXISTS live_quiz_teilnehmer (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id  TEXT NOT NULL UNIQUE,
        quiz_code   TEXT NOT NULL,
        spieler     TEXT NOT NULL,
        beigetreten TEXT DEFAULT (datetime('now')),
        UNIQUE(quiz_code, spieler)
    );
    CREATE TABLE IF NOT EXISTS lernbereich_niveau (
        id                   TEXT PRIMARY KEY,
        schueler_name        TEXT NOT NULL,
        lernbereich          TEXT NOT NULL,
        aufgaben_geloest     INTEGER NOT NULL DEFAULT 0,
        gesamt_aufgaben      INTEGER NOT NULL DEFAULT 50,
        korrekte_antworten   INTEGER NOT NULL DEFAULT 0,
        genauigkeit          REAL NOT NULL DEFAULT 0.0,
        level                TEXT NOT NULL DEFAULT 'BLAU',
        letzte_aktivitaet    TEXT,
        erstellt_am          TEXT DEFAULT (datetime('now')),
        UNIQUE(schueler_name, lernbereich)
    );
    """)
    conn.commit()

    # Migration: fehlende Spalten zu bestehenden Installationen hinzufügen
    migrations = [
        "ALTER TABLE users ADD COLUMN ist_aktiv      INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE users ADD COLUMN is_admin        INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN email_verified  INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE users ADD COLUMN totp_enabled    INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN totp_secret     TEXT",
        "ALTER TABLE users ADD COLUMN letzter_login   TEXT",
        "ALTER TABLE users ADD COLUMN lizenz_typ      TEXT NOT NULL DEFAULT 'free'",
        "ALTER TABLE users ADD COLUMN lizenz_bis      TEXT",
        "ALTER TABLE users ADD COLUMN notiz           TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE session_aktiv ADD COLUMN spielstand TEXT",
        "ALTER TABLE live_quiz_teilnehmer ADD COLUMN letzte_aktivitaet TEXT DEFAULT (datetime('now'))",
        "ALTER TABLE lernbereich_niveau ADD COLUMN gesamt_aufgaben INTEGER NOT NULL DEFAULT 50",
    ]
    for sql in migrations:
        try:
            conn.execute(sql)
            conn.commit()
        except sqlite3.OperationalError:
            pass  # Spalte existiert bereits

    # E-Mails auf Kleinschreibung normalisieren (Einmal-Migration)
    try:
        conn.execute("UPDATE users SET email = LOWER(email) WHERE email != LOWER(email)")
        conn.commit()
    except Exception:
        pass

    conn.close()

init_db()

# ── Auth helpers ───────────────────────────────────────────────────────────────
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def _verify_pbkdf2(pw: str, hashed: str) -> bool:
    """Kompatibilität mit altem pbkdf2$sha256$iterations$salt$hash Format."""
    try:
        parts = hashed.split("$")
        if len(parts) != 5:
            return False
        _, algo, iterations, salt_hex, stored = parts
        import hashlib, hmac as _hmac
        dk = hashlib.pbkdf2_hmac(algo, pw.encode(), bytes.fromhex(salt_hex), int(iterations))
        return _hmac.compare_digest(dk.hex(), stored)
    except Exception:
        return False

def verify_pw(pw: str, hashed: str) -> bool:
    try:
        if hashed.startswith("pbkdf2$"):
            return _verify_pbkdf2(pw, hashed)
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def make_token(user_id: int, is_admin: bool = False) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    role = "admin" if is_admin else "lehrer"
    return jwt.encode({"sub": str(user_id), "role": role, "exp": exp}, JWT_SECRET, algorithm=JWT_ALGO)

def make_temp_token(user_id: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=5)
    return jwt.encode({"sub": f"2fa:{user_id}", "exp": exp}, JWT_SECRET, algorithm=JWT_ALGO)

def get_current_user(
    cred: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: sqlite3.Connection = Depends(get_db),
):
    if not cred:
        raise HTTPException(401, "Nicht authentifiziert")
    try:
        payload = jwt.decode(cred.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        sub = payload.get("sub", "")
        if sub.startswith("2fa:"):
            raise HTTPException(401, "Token ungültig")
        user_id = int(sub)
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token abgelaufen – bitte neu anmelden")
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(401, "Token ungültig")
    row = db.execute("SELECT * FROM users WHERE id=? AND ist_aktiv=1", (user_id,)).fetchone()
    if not row:
        raise HTTPException(401, "Benutzer nicht gefunden")
    return dict(row)

def require_admin(user=Depends(get_current_user)):
    if not user.get("is_admin"):
        raise HTTPException(403, "Nur Admins haben Zugriff")
    return user

def user_out(row: dict) -> dict:
    return {
        "id":           row["id"],
        "vorname":      row.get("vorname") or "",
        "nachname":     row.get("nachname") or "",
        "email":        row["email"],
        "schule":       row.get("schule") or "",
        "rolle":        "admin" if row.get("is_admin") else "lehrer",
        "is_admin":     bool(row.get("is_admin")),
        "totp_enabled": bool(row.get("totp_enabled")),
        "letzter_login": row.get("letzter_login"),
        "lizenz_typ":   row.get("lizenz_typ") or "free",
        "lizenz_bis":   row.get("lizenz_bis"),
        "notiz":        row.get("notiz") or "",
        "erstellt":     row.get("erstellt"),
    }

def _six_digit_code() -> str:
    return "".join(random.choices(string.digits, k=6))

# ── E-Mail via Resend ──────────────────────────────────────────────────────────
def send_email(to: str, subject: str, html: str) -> bool:
    if not RESEND_KEY:
        return False
    try:
        r = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_KEY}"},
            json={"from": FROM_EMAIL, "to": [to], "subject": subject, "html": html},
            timeout=10,
        )
        return r.status_code in (200, 201)
    except Exception:
        return False

# ── Pydantic Schemas ───────────────────────────────────────────────────────────
class RegisterReq(BaseModel):
    vorname: str
    nachname: str = ""
    email: str
    schule: str = ""
    passwort: str

class LoginReq(BaseModel):
    email: str
    passwort: str

class TotpLoginReq(BaseModel):
    temp_token: str
    code: str

class VerifyEmailReq(BaseModel):
    email: str
    token: str

class ResendVerifyReq(BaseModel):
    email: str

class PwChangeReq(BaseModel):
    altes_passwort: str
    neues_passwort: str

class ProfileUpdateReq(BaseModel):
    vorname: str
    nachname: str = ""
    schule: str = ""

class TotpEnableReq(BaseModel):
    code: str

class TotpDisableReq(BaseModel):
    passwort: str

class ResetRequestReq(BaseModel):
    email: str

class ResetConfirmReq(BaseModel):
    email: str
    token: str
    neues_passwort: str

class LizenzUpdateReq(BaseModel):
    lizenz_typ: str
    lizenz_bis: Optional[str] = None
    notiz: Optional[str] = None

class AdminEmailReq(BaseModel):
    betreff: str
    nachricht: str

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "service": "BuchungsWerk API", "version": "2.0.0"}

@app.get("/health")
def health():
    return {"status": "ok", "db": DB_PATH, "time": datetime.now().isoformat()}

# ══════════════════════════════════════════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/auth/register", status_code=201)
def register(data: RegisterReq, db: sqlite3.Connection = Depends(get_db)):
    email = data.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "Ungültige E-Mail-Adresse")
    if len(data.passwort) < 8:
        raise HTTPException(400, "Passwort muss mindestens 8 Zeichen haben")

    count = db.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    is_admin_val = 1 if count == 0 else 0

    try:
        cur = db.execute(
            """INSERT INTO users (vorname, nachname, email, schule, passwort_hash, is_admin, email_verified)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (data.vorname.strip(), data.nachname.strip(), email, data.schule.strip(),
             hash_pw(data.passwort), is_admin_val, 0 if REQUIRE_VERIFY else 1)
        )
        db.commit()
        user_id = cur.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(409, "Diese E-Mail-Adresse ist bereits registriert.")

    row = dict(db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone())

    if REQUIRE_VERIFY:
        code = _six_digit_code()
        exp = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        db.execute("INSERT INTO token_store (user_id, token, typ, abgelaufen) VALUES (?,?,?,?)",
                   (user_id, code, "verify", exp))
        db.commit()
        send_email(email, "BuchungsWerk – E-Mail bestätigen",
            f"<p>Hallo {data.vorname},</p>"
            f"<p>dein Bestätigungscode: <strong style='font-size:22px;letter-spacing:4px'>{code}</strong></p>"
            f"<p>Gültig für 1 Stunde.</p>")
        return {"requires_verify": True}

    return {"token": make_token(user_id, bool(is_admin_val)), "user": user_out(row)}


@app.post("/auth/login")
def login(data: LoginReq, db: sqlite3.Connection = Depends(get_db)):
    email = data.email.strip().lower()
    row = db.execute("SELECT * FROM users WHERE email=? AND ist_aktiv=1", (email,)).fetchone()
    if not row or not verify_pw(data.passwort, row["passwort_hash"]):
        raise HTTPException(401, "E-Mail oder Passwort falsch.")
    row = dict(row)

    if not row.get("email_verified", 1):
        raise HTTPException(401, "E-Mail-Adresse noch nicht bestätigt.")

    if row.get("totp_enabled") and row.get("totp_secret"):
        return {"requires_2fa": True, "temp_token": make_temp_token(row["id"])}

    # Alten pbkdf2-Hash automatisch auf bcrypt migrieren
    if row["passwort_hash"].startswith("pbkdf2$"):
        db.execute("UPDATE users SET passwort_hash=? WHERE id=?",
                   (hash_pw(data.passwort), row["id"]))

    db.execute("UPDATE users SET letzter_login=datetime('now') WHERE id=?", (row["id"],))
    db.commit()
    row["letzter_login"] = datetime.now().isoformat()
    return {"token": make_token(row["id"], bool(row.get("is_admin"))), "user": user_out(row)}


@app.post("/auth/totp/login")
def totp_login(data: TotpLoginReq, db: sqlite3.Connection = Depends(get_db)):
    try:
        payload = jwt.decode(data.temp_token, JWT_SECRET, algorithms=[JWT_ALGO])
        sub = payload.get("sub", "")
        if not sub.startswith("2fa:"):
            raise ValueError
        user_id = int(sub.split(":")[1])
    except Exception:
        raise HTTPException(401, "Ungültiger Temp-Token")

    row = db.execute("SELECT * FROM users WHERE id=? AND ist_aktiv=1", (user_id,)).fetchone()
    if not row:
        raise HTTPException(401, "Benutzer nicht gefunden")
    row = dict(row)

    if not pyotp.TOTP(row["totp_secret"]).verify(data.code.strip(), valid_window=1):
        raise HTTPException(401, "Ungültiger Authenticator-Code")

    db.execute("UPDATE users SET letzter_login=datetime('now') WHERE id=?", (user_id,))
    db.commit()
    row["letzter_login"] = datetime.now().isoformat()
    return {"token": make_token(user_id, bool(row.get("is_admin"))), "user": user_out(row)}


@app.post("/auth/verify-email")
def verify_email_ep(data: VerifyEmailReq, db: sqlite3.Connection = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not user:
        raise HTTPException(400, "Ungültiger Code")
    user = dict(user)

    entry = db.execute(
        "SELECT * FROM token_store WHERE user_id=? AND token=? AND typ='verify' AND verwendet=0",
        (user["id"], data.token.strip())
    ).fetchone()
    if not entry:
        raise HTTPException(400, "Ungültiger oder abgelaufener Code")

    exp = datetime.fromisoformat(entry["abgelaufen"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > exp:
        raise HTTPException(400, "Code abgelaufen – bitte neu anfordern")

    db.execute("UPDATE token_store SET verwendet=1 WHERE id=?", (entry["id"],))
    db.execute("UPDATE users SET email_verified=1, letzter_login=datetime('now') WHERE id=?", (user["id"],))
    db.commit()
    user["email_verified"] = 1
    user["letzter_login"] = datetime.now().isoformat()
    return {"token": make_token(user["id"], bool(user.get("is_admin"))), "user": user_out(user)}


@app.post("/auth/resend-verify")
def resend_verify(data: ResendVerifyReq, db: sqlite3.Connection = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.execute("SELECT * FROM users WHERE email=? AND email_verified=0", (email,)).fetchone()
    if not user:
        return {"ok": True}
    user = dict(user)
    code = _six_digit_code()
    exp = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    db.execute("INSERT INTO token_store (user_id, token, typ, abgelaufen) VALUES (?,?,?,?)",
               (user["id"], code, "verify", exp))
    db.commit()
    send_email(email, "BuchungsWerk – Neuer Bestätigungscode",
        f"<p>Hallo {user['vorname']},</p>"
        f"<p>dein neuer Bestätigungscode: <strong style='font-size:22px;letter-spacing:4px'>{code}</strong></p>"
        f"<p>Gültig für 1 Stunde.</p>")
    return {"ok": True}


@app.post("/auth/reset-request")
def reset_request(data: ResetRequestReq, db: sqlite3.Connection = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.execute("SELECT * FROM users WHERE email=? AND ist_aktiv=1", (email,)).fetchone()
    if user:
        user = dict(user)
        code = _six_digit_code()
        exp = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
        db.execute("INSERT INTO token_store (user_id, token, typ, abgelaufen) VALUES (?,?,?,?)",
                   (user["id"], code, "reset", exp))
        db.commit()
        send_email(email, "BuchungsWerk – Passwort zurücksetzen",
            f"<p>Hallo {user['vorname']},</p>"
            f"<p>dein Reset-Code: <strong style='font-size:22px;letter-spacing:4px'>{code}</strong></p>"
            f"<p>Gültig für 30 Minuten.</p>")
    return {"ok": True}


@app.post("/auth/reset-confirm")
def reset_confirm(data: ResetConfirmReq, db: sqlite3.Connection = Depends(get_db)):
    if len(data.neues_passwort) < 8:
        raise HTTPException(400, "Passwort muss mindestens 8 Zeichen haben")
    email = data.email.strip().lower()
    user = db.execute("SELECT * FROM users WHERE email=? AND ist_aktiv=1", (email,)).fetchone()
    if not user:
        raise HTTPException(400, "Ungültiger Code")
    user = dict(user)

    entry = db.execute(
        "SELECT * FROM token_store WHERE user_id=? AND token=? AND typ='reset' AND verwendet=0",
        (user["id"], data.token.strip())
    ).fetchone()
    if not entry:
        raise HTTPException(400, "Ungültiger oder bereits verwendeter Code")

    exp = datetime.fromisoformat(entry["abgelaufen"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > exp:
        raise HTTPException(400, "Code abgelaufen – bitte neu anfordern")

    db.execute("UPDATE token_store SET verwendet=1 WHERE id=?", (entry["id"],))
    db.execute("UPDATE users SET passwort_hash=? WHERE id=?",
               (hash_pw(data.neues_passwort), user["id"]))
    db.commit()
    return {"ok": True}


@app.get("/auth/me")
def me(user=Depends(get_current_user)):
    return user_out(user)


@app.put("/auth/profile")
def update_profile(data: ProfileUpdateReq, user=Depends(get_current_user),
                   db: sqlite3.Connection = Depends(get_db)):
    db.execute("UPDATE users SET vorname=?, nachname=?, schule=? WHERE id=?",
               (data.vorname.strip(), data.nachname.strip(), data.schule.strip(), user["id"]))
    db.commit()
    return user_out(dict(db.execute("SELECT * FROM users WHERE id=?", (user["id"],)).fetchone()))


@app.put("/auth/password")
def change_password(data: PwChangeReq, user=Depends(get_current_user),
                    db: sqlite3.Connection = Depends(get_db)):
    if not verify_pw(data.altes_passwort, user["passwort_hash"]):
        raise HTTPException(401, "Aktuelles Passwort falsch")
    if len(data.neues_passwort) < 8:
        raise HTTPException(400, "Neues Passwort muss mindestens 8 Zeichen haben")
    db.execute("UPDATE users SET passwort_hash=? WHERE id=?",
               (hash_pw(data.neues_passwort), user["id"]))
    db.commit()
    return {"ok": True}


@app.post("/auth/totp/setup")
def totp_setup(user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    secret = pyotp.random_base32()
    db.execute("UPDATE users SET totp_secret=? WHERE id=?", (secret, user["id"]))
    db.commit()
    uri = pyotp.TOTP(secret).provisioning_uri(user["email"], issuer_name="BuchungsWerk")
    return {"secret": secret, "uri": uri}


@app.post("/auth/totp/enable")
def totp_enable(data: TotpEnableReq, user=Depends(get_current_user),
                db: sqlite3.Connection = Depends(get_db)):
    row = db.execute("SELECT totp_secret FROM users WHERE id=?", (user["id"],)).fetchone()
    if not row or not row["totp_secret"]:
        raise HTTPException(400, "TOTP-Setup noch nicht durchgeführt")
    if not pyotp.TOTP(row["totp_secret"]).verify(data.code.strip(), valid_window=1):
        raise HTTPException(400, "Ungültiger Code")
    db.execute("UPDATE users SET totp_enabled=1 WHERE id=?", (user["id"],))
    db.commit()
    return {"ok": True}


@app.post("/auth/totp/disable")
def totp_disable(data: TotpDisableReq, user=Depends(get_current_user),
                 db: sqlite3.Connection = Depends(get_db)):
    if not verify_pw(data.passwort, user["passwort_hash"]):
        raise HTTPException(401, "Falsches Passwort")
    db.execute("UPDATE users SET totp_enabled=0, totp_secret=NULL WHERE id=?", (user["id"],))
    db.commit()
    return {"ok": True}

# ══════════════════════════════════════════════════════════════════════════════
# ADMIN
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/admin/users")
def admin_users(db: sqlite3.Connection = Depends(get_db), _=Depends(require_admin)):
    rows = db.execute("SELECT * FROM users ORDER BY erstellt DESC").fetchall()
    return [user_out(dict(r)) for r in rows]


@app.get("/admin/stats")
def admin_stats(db: sqlite3.Connection = Depends(get_db), _=Depends(require_admin)):
    total   = db.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    verified = db.execute("SELECT COUNT(*) FROM users WHERE email_verified=1").fetchone()[0]
    totp    = db.execute("SELECT COUNT(*) FROM users WHERE totp_enabled=1").fetchone()[0]
    free    = db.execute("SELECT COUNT(*) FROM users WHERE lizenz_typ='free'").fetchone()[0]
    pro     = db.execute("SELECT COUNT(*) FROM users WHERE lizenz_typ='pro'").fetchone()[0]
    today   = db.execute(
        "SELECT COUNT(*) FROM users WHERE date(letzter_login)=date('now')"
    ).fetchone()[0]
    return {"total_users": total, "verified_users": verified, "totp_users": totp,
            "free_users": free, "pro_users": pro, "active_today": today}


@app.get("/admin/smtp/status")
def admin_smtp(_=Depends(require_admin)):
    return {"configured": bool(RESEND_KEY)}


@app.patch("/admin/users/{uid}/lizenz")
def admin_lizenz(uid: int, data: LizenzUpdateReq,
                 db: sqlite3.Connection = Depends(get_db), _=Depends(require_admin)):
    db.execute("UPDATE users SET lizenz_typ=?, lizenz_bis=?, notiz=? WHERE id=?",
               (data.lizenz_typ, data.lizenz_bis, data.notiz, uid))
    db.commit()
    row = db.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    if not row:
        raise HTTPException(404, "Benutzer nicht gefunden")
    return user_out(dict(row))


@app.delete("/admin/users/{uid}", status_code=204)
def admin_delete_user(uid: int, db: sqlite3.Connection = Depends(get_db),
                      admin=Depends(require_admin)):
    if uid == admin["id"]:
        raise HTTPException(400, "Eigenen Account nicht löschbar")
    db.execute("DELETE FROM users WHERE id=?", (uid,))
    db.commit()


@app.patch("/admin/users/{uid}/admin")
def admin_toggle_admin(uid: int, db: sqlite3.Connection = Depends(get_db),
                       _=Depends(require_admin)):
    row = db.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    if not row:
        raise HTTPException(404, "Benutzer nicht gefunden")
    new_val = 0 if row["is_admin"] else 1
    db.execute("UPDATE users SET is_admin=? WHERE id=?", (new_val, uid))
    db.commit()
    return {"is_admin": bool(new_val)}


@app.post("/admin/users/{uid}/email")
def admin_send_email(uid: int, data: AdminEmailReq,
                     db: sqlite3.Connection = Depends(get_db), _=Depends(require_admin)):
    row = db.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    if not row:
        raise HTTPException(404, "Benutzer nicht gefunden")
    ok = send_email(row["email"], data.betreff,
        f"<p>Hallo {row['vorname']},</p>"
        f"<p>{data.nachricht.replace(chr(10), '<br>')}</p>"
        f"<hr><p style='color:#999;font-size:12px'>BuchungsWerk</p>")
    if not ok:
        raise HTTPException(502, "E-Mail konnte nicht gesendet werden")
    return {"ok": True}

# ══════════════════════════════════════════════════════════════════════════════
# BESTEHENDE ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

class KlasseCreate(BaseModel):
    name: str
    stufe: int
    schuljahr: str

@app.get("/klassen")
def list_klassen(db: sqlite3.Connection = Depends(get_db), _=Depends(get_current_user)):
    return [dict(r) for r in db.execute("SELECT * FROM klassen ORDER BY stufe, name").fetchall()]

@app.post("/klassen", status_code=201)
def create_klasse(data: KlasseCreate, db: sqlite3.Connection = Depends(get_db),
                  _=Depends(get_current_user)):
    try:
        cur = db.execute("INSERT INTO klassen (name,stufe,schuljahr) VALUES (?,?,?)",
                         (data.name, data.stufe, data.schuljahr))
        db.commit()
        return {"id": cur.lastrowid, **data.model_dump()}
    except sqlite3.IntegrityError:
        raise HTTPException(400, f"Klasse '{data.name}' existiert bereits")

@app.delete("/klassen/{id}", status_code=204)
def delete_klasse(id: int, db: sqlite3.Connection = Depends(get_db), _=Depends(get_current_user)):
    db.execute("DELETE FROM klassen WHERE id=?", (id,)); db.commit()

class SchuelerCreate(BaseModel):
    klasse_id: int
    vorname: str
    nachname: str
    kuerzel: Optional[str] = None

@app.get("/klassen/{klasse_id}/schueler")
def list_schueler(klasse_id: int, db: sqlite3.Connection = Depends(get_db),
                  _=Depends(get_current_user)):
    rows = db.execute(
        "SELECT * FROM schueler WHERE klasse_id=? ORDER BY nachname, vorname", (klasse_id,)
    ).fetchall()
    return [dict(r) for r in rows]

@app.post("/schueler", status_code=201)
def create_schueler(data: SchuelerCreate, db: sqlite3.Connection = Depends(get_db),
                    _=Depends(get_current_user)):
    cur = db.execute("INSERT INTO schueler (klasse_id,vorname,nachname,kuerzel) VALUES (?,?,?,?)",
                     (data.klasse_id, data.vorname, data.nachname, data.kuerzel))
    db.commit()
    return {"id": cur.lastrowid, **data.model_dump()}

@app.delete("/schueler/{id}", status_code=204)
def delete_schueler(id: int, db: sqlite3.Connection = Depends(get_db), _=Depends(get_current_user)):
    db.execute("DELETE FROM schueler WHERE id=?", (id,)); db.commit()

class SessionCreate(BaseModel):
    klasse_id: Optional[int] = None
    schueler_id: Optional[int] = None
    titel: Optional[str] = None
    klasse_stufe: Optional[int] = None
    pruefungsart: Optional[str] = None
    config_json: Optional[str] = None

@app.post("/sessions", status_code=201)
def create_session(data: SessionCreate, db: sqlite3.Connection = Depends(get_db)):
    cur = db.execute(
        "INSERT INTO quiz_sessions (klasse_id,schueler_id,titel,klasse_stufe,pruefungsart,config_json) VALUES (?,?,?,?,?,?)",
        (data.klasse_id, data.schueler_id, data.titel, data.klasse_stufe, data.pruefungsart, data.config_json)
    )
    db.commit()
    return {"id": cur.lastrowid, "gestartet": datetime.now().isoformat()}

@app.post("/sessions/{id}/abschliessen")
def session_abschliessen(id: int, db: sqlite3.Connection = Depends(get_db)):
    db.execute("UPDATE quiz_sessions SET beendet=datetime('now') WHERE id=?", (id,))
    db.commit(); return {"ok": True}

@app.get("/sessions/{id}/zusammenfassung")
def session_zusammenfassung(id: int, db: sqlite3.Connection = Depends(get_db),
                             _=Depends(get_current_user)):
    session = db.execute("SELECT * FROM quiz_sessions WHERE id=?", (id,)).fetchone()
    if not session: raise HTTPException(404, "Session nicht gefunden")
    ergebnisse = db.execute(
        "SELECT * FROM ergebnisse WHERE session_id=? ORDER BY rowid", (id,)
    ).fetchall()
    gesamt_p   = sum(r["punkte"] for r in ergebnisse)
    gesamt_max = sum(r["max_punkte"] for r in ergebnisse)
    return {"session": dict(session), "ergebnisse": [dict(r) for r in ergebnisse],
            "gesamt_punkte": gesamt_p, "gesamt_max": gesamt_max,
            "prozent": round(gesamt_p / gesamt_max * 100, 1) if gesamt_max else 0}

class ErgebnisCreate(BaseModel):
    session_id: int
    frage_nr: str
    frage_typ: Optional[str] = None
    punkte: int = 0
    max_punkte: int = 0
    korrekt: bool = False
    antwort_json: Optional[str] = None

@app.post("/ergebnisse", status_code=201)
def create_ergebnis(data: ErgebnisCreate, db: sqlite3.Connection = Depends(get_db)):
    cur = db.execute(
        "INSERT INTO ergebnisse (session_id,frage_nr,frage_typ,punkte,max_punkte,korrekt,antwort_json) VALUES (?,?,?,?,?,?,?)",
        (data.session_id, data.frage_nr, data.frage_typ, data.punkte, data.max_punkte,
         int(data.korrekt), data.antwort_json)
    )
    db.commit(); return {"id": cur.lastrowid}

@app.get("/klassen/{klasse_id}/statistik")
def klassen_statistik(klasse_id: int, db: sqlite3.Connection = Depends(get_db),
                      _=Depends(get_current_user)):
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
        WHERE s.klasse_id = ? GROUP BY s.id ORDER BY s.nachname, s.vorname
    """, (klasse_id,)).fetchall()
    return [dict(r) for r in rows]

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
    q = "SELECT id,titel,jahrgangsstufe,typ,pruefungsart,firma_name,firma_icon,gesamt_punkte,erstellt FROM materialien"
    rows = db.execute(q + (" WHERE jahrgangsstufe=? ORDER BY erstellt DESC" if stufe else " ORDER BY jahrgangsstufe, erstellt DESC"),
                      (stufe,) if stufe else ()).fetchall()
    return [dict(r) for r in rows]

@app.get("/materialien/{id}")
def get_material(id: int, db: sqlite3.Connection = Depends(get_db)):
    row = db.execute("SELECT * FROM materialien WHERE id=?", (id,)).fetchone()
    if not row: raise HTTPException(404, "Material nicht gefunden")
    return dict(row)

@app.post("/materialien", status_code=201)
def create_material(data: MaterialCreate, db: sqlite3.Connection = Depends(get_db),
                    _=Depends(get_current_user)):
    cur = db.execute(
        "INSERT INTO materialien (titel,jahrgangsstufe,typ,pruefungsart,firma_name,firma_icon,gesamt_punkte,daten_json) VALUES (?,?,?,?,?,?,?,?)",
        (data.titel, data.jahrgangsstufe, data.typ, data.pruefungsart,
         data.firma_name, data.firma_icon, data.gesamt_punkte, data.daten_json)
    )
    db.commit(); return {"id": cur.lastrowid, "erstellt": datetime.now().isoformat()}

@app.put("/materialien/{id}")
def update_material(id: int, data: MaterialCreate, db: sqlite3.Connection = Depends(get_db),
                    _=Depends(get_current_user)):
    db.execute(
        "UPDATE materialien SET titel=?,jahrgangsstufe=?,typ=?,pruefungsart=?,firma_name=?,firma_icon=?,gesamt_punkte=?,daten_json=?,geaendert=datetime('now') WHERE id=?",
        (data.titel, data.jahrgangsstufe, data.typ, data.pruefungsart,
         data.firma_name, data.firma_icon, data.gesamt_punkte, data.daten_json, id)
    )
    db.commit(); return {"ok": True}

@app.delete("/materialien/{id}", status_code=204)
def delete_material(id: int, db: sqlite3.Connection = Depends(get_db), _=Depends(get_current_user)):
    db.execute("DELETE FROM materialien WHERE id=?", (id,)); db.commit()

class SpielErgebnis(BaseModel):
    session_code: str
    spieler: str
    punkte: int = 0
    max_punkte: int = 0
    zeit: int = 0
    klasse: Optional[str] = None

@app.post("/spielrangliste", status_code=201)
def create_spielergebnis(data: SpielErgebnis, db: sqlite3.Connection = Depends(get_db)):
    cur = db.execute(
        "INSERT INTO spielrangliste (session_code,spieler,punkte,max_punkte,zeit,klasse) VALUES (?,?,?,?,?,?)",
        (data.session_code, data.spieler, data.punkte, data.max_punkte, data.zeit, data.klasse)
    )
    db.commit(); return {"id": cur.lastrowid}

@app.get("/rangliste/{code}")
def get_rangliste(code: str, db: sqlite3.Connection = Depends(get_db)):
    fertig = db.execute(
        "SELECT spieler,punkte,max_punkte,zeit,klasse,ts FROM spielrangliste "
        "WHERE session_code=? ORDER BY punkte DESC, zeit ASC LIMIT 50",
        (code,)
    ).fetchall()
    # Active players: seen in last 10 min, not yet in spielrangliste for this session
    aktiv_rows = db.execute(
        "SELECT spieler,spielstand,klasse,ts "
        "FROM session_aktiv "
        "WHERE session_code=? "
        "  AND datetime(ts) >= datetime('now', '-10 minutes') "
        "  AND spieler NOT IN (SELECT spieler FROM spielrangliste WHERE session_code=?)",
        (code, code)
    ).fetchall()
    import json as _json
    aktiv = []
    for row in aktiv_rows:
        d = dict(row)
        stand = {}
        try:
            stand = _json.loads(d.get("spielstand") or "{}")
        except Exception:
            pass
        aktiv.append({
            "spieler":    d["spieler"],
            "punkte":     stand.get("punkte", 0),
            "max_punkte": stand.get("max_punkte", 0),
            "zeit":       0,
            "klasse":     d["klasse"],
            "ts":         d["ts"],
        })
    combined = [dict(r) for r in fertig] + aktiv
    combined.sort(key=lambda r: (-r["punkte"], r["zeit"] or 0))
    return combined[:50]

# ── Session-Aktiv: Schüler-Anwesenheit ────────────────────────────────────────

class SessionJoinReq(BaseModel):
    session_code: str
    spieler: str
    klasse: Optional[str] = None
    punkte: int = 0
    max_punkte: int = 0

@app.post("/session/join", status_code=200)
def session_join(data: SessionJoinReq, db: sqlite3.Connection = Depends(get_db)):
    import json as _json
    stand_json = _json.dumps({"punkte": data.punkte, "max_punkte": data.max_punkte})
    db.execute(
        "INSERT INTO session_aktiv (session_code, spieler, klasse, spielstand, ts) "
        "VALUES (?,?,?,?,datetime('now')) "
        "ON CONFLICT(session_code, spieler) "
        "DO UPDATE SET ts=datetime('now'), klasse=excluded.klasse, spielstand=excluded.spielstand",
        (data.session_code, data.spieler, data.klasse, stand_json)
    )
    db.commit()
    return {"ok": True}

# ── Spielstand: Checkpoint speichern / laden ──────────────────────────────────

class SpielstandReq(BaseModel):
    punkte: int = 0
    max_punkte: int = 0
    aufgabe_idx: int = 0

@app.post("/session/stand/{code}/{name}", status_code=200)
def save_spielstand(code: str, name: str, data: SpielstandReq,
                    db: sqlite3.Connection = Depends(get_db)):
    import json
    stand_json = json.dumps({
        "punkte": data.punkte,
        "max_punkte": data.max_punkte,
        "aufgabe_idx": data.aufgabe_idx,
        "ts": datetime.now().isoformat()
    })
    db.execute(
        "INSERT INTO session_aktiv (session_code, spieler, spielstand, ts) "
        "VALUES (?,?,?,datetime('now')) "
        "ON CONFLICT(session_code, spieler) "
        "DO UPDATE SET spielstand=excluded.spielstand, ts=datetime('now')",
        (code, name, stand_json)
    )
    db.commit()
    return {"ok": True}

@app.get("/session/stand/{code}/{name}")
def get_spielstand(code: str, name: str, db: sqlite3.Connection = Depends(get_db)):
    row = db.execute(
        "SELECT spielstand FROM session_aktiv WHERE session_code=? AND spieler=?",
        (code, name)
    ).fetchone()
    if not row or not row["spielstand"]:
        return {"found": False}
    import json
    try:
        stand = json.loads(row["spielstand"])
        return {"found": True, **stand}
    except Exception:
        return {"found": False}

# ── Kampagne-Kontrolle: Lehrer-Ende-Ankündigung ───────────────────────────────

class SessionKontrolleReq(BaseModel):
    end_in: int = 0

@app.post("/session/kontrolle/{code}", status_code=200)
def set_session_kontrolle(code: str, data: SessionKontrolleReq,
                           db: sqlite3.Connection = Depends(get_db)):
    db.execute(
        "INSERT INTO session_kontrolle (session_code, end_in, ts) "
        "VALUES (?,?,datetime('now')) "
        "ON CONFLICT(session_code) "
        "DO UPDATE SET end_in=excluded.end_in, ts=datetime('now')",
        (code, data.end_in)
    )
    db.commit()
    return {"ok": True}

@app.get("/session/kontrolle/{code}")
def get_session_kontrolle(code: str, db: sqlite3.Connection = Depends(get_db)):
    row = db.execute(
        "SELECT end_in, ts FROM session_kontrolle WHERE session_code=?", (code,)
    ).fetchone()
    if not row:
        return {"end_in": 0}
    return dict(row)

class SupportLog(BaseModel):
    typ: Optional[str] = None
    text: Optional[str] = None
    ts: Optional[str] = None

@app.post("/support", status_code=201)
def create_support(data: SupportLog, db: sqlite3.Connection = Depends(get_db)):
    db.execute("INSERT INTO support_logs (typ,text,ts) VALUES (?,?,?)",
               (data.typ, data.text, data.ts or datetime.now().isoformat()))
    db.commit(); return {"ok": True}

# ══════════════════════════════════════════════════════════════════════════════
# LIVE-QUIZ (Lehrer-Orchestrierung)
# ══════════════════════════════════════════════════════════════════════════════

import json as _json_mod
import re as _re
import time as _time
from collections import defaultdict as _defaultdict

# ── Rate-Limiter (per session_id, sliding window 60 s) ─────────────────────────
_rate_buckets: dict[str, list[float]] = _defaultdict(list)
_RATE_LIMIT = 60  # max Requests pro 60 Sekunden pro session_id

def _rate_check(session_id: str):
    now = _time.monotonic()
    bucket = _rate_buckets[session_id]
    _rate_buckets[session_id] = [t for t in bucket if now - t < 60]
    if len(_rate_buckets[session_id]) >= _RATE_LIMIT:
        raise HTTPException(429, "Zu viele Anfragen – bitte warte kurz")
    _rate_buckets[session_id].append(now)

def _quiz_code() -> str:
    """8-stelliger alphanumerischer Code, eindeutig lesbar (keine 0/O/1/I). 32^8 ≈ 1 Billion Kombos."""
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(chars) for _ in range(8))

class LiveQuizStart(BaseModel):
    titel: str = "Live-Quiz"
    klasse_id: Optional[int] = None
    aufgaben_json: str  # JSON-Array der Quiz-Fragen

class LiveQuizJoin(BaseModel):
    spieler: str

class LiveAntwort(BaseModel):
    session_id: str
    frage_nr: int
    antwort_idx: int
    zeit_ms: int = 0

@app.post("/quiz/live/start", status_code=201)
def live_quiz_start(data: LiveQuizStart, user=Depends(get_current_user),
                    db: sqlite3.Connection = Depends(get_db)):
    # Validierung: aufgaben_json muss ein gültiges JSON-Array sein
    try:
        aufgaben = _json_mod.loads(data.aufgaben_json)
        if not isinstance(aufgaben, list) or len(aufgaben) == 0:
            raise ValueError
    except Exception:
        raise HTTPException(400, "aufgaben_json muss ein nicht-leeres JSON-Array sein")

    for attempt in range(20):
        code = _quiz_code()
        try:
            db.execute(
                "INSERT INTO live_quizze (code, lehrer_id, titel, klasse_id, aufgaben_json) VALUES (?,?,?,?,?)",
                (code, user["id"], data.titel.strip() or "Live-Quiz", data.klasse_id, data.aufgaben_json)
            )
            db.commit()
            return {"code": code, "titel": data.titel, "fragen": len(aufgaben),
                    "gestartet": datetime.now().isoformat()}
        except sqlite3.IntegrityError:
            continue  # Code collision – retry
    raise HTTPException(500, "Konnte keinen eindeutigen Code generieren")


@app.get("/quiz/live/meine")
def live_quiz_meine(user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute(
        "SELECT id,code,titel,status,frage_nr,gestartet,beendet FROM live_quizze "
        "WHERE lehrer_id=? ORDER BY gestartet DESC LIMIT 30",
        (user["id"],)
    ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        # Teilnehmeranzahl anhängen
        d["teilnehmer"] = db.execute(
            "SELECT COUNT(DISTINCT spieler) FROM live_quiz_antworten WHERE quiz_code=?", (d["code"],)
        ).fetchone()[0]
        result.append(d)
    return result


@app.get("/quiz/live/{code}")
def live_quiz_info(code: str, db: sqlite3.Connection = Depends(get_db)):
    code = code.upper()
    row = db.execute(
        "SELECT id,code,titel,status,frage_nr,aufgaben_json,gestartet,beendet FROM live_quizze WHERE code=?",
        (code,)
    ).fetchone()
    if not row:
        raise HTTPException(404, "Quiz nicht gefunden")
    q = dict(row)
    aufgaben = _json_mod.loads(q.pop("aufgaben_json") or "[]")
    q["fragen_gesamt"] = len(aufgaben)

    if q["status"] == "laufend":
        fn = q["frage_nr"]
        if 0 <= fn < len(aufgaben):
            frage = dict(aufgaben[fn])
            frage.pop("richtig", None)   # korrekte Antwort nicht an Schüler senden
            q["aktuelle_frage"] = frage
        else:
            q["aktuelle_frage"] = None
    return q


@app.post("/quiz/live/{code}/join", status_code=201)
def live_quiz_join(code: str, data: LiveQuizJoin, db: sqlite3.Connection = Depends(get_db)):
    code = code.upper()
    quiz = db.execute(
        "SELECT id FROM live_quizze WHERE code=? AND status='laufend'", (code,)
    ).fetchone()
    if not quiz:
        raise HTTPException(404, "Quiz nicht gefunden oder bereits beendet")
    spieler = data.spieler.strip()[:40]
    if not spieler:
        raise HTTPException(400, "Name erforderlich")
    session_id = secrets.token_urlsafe(24)
    try:
        db.execute(
            "INSERT INTO live_quiz_teilnehmer (session_id, quiz_code, spieler) VALUES (?,?,?)",
            (session_id, code, spieler),
        )
        db.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(409, "Name bereits vergeben – wähle einen anderen Namen")
    return {"session_id": session_id, "quiz_code": code, "spieler": spieler}


@app.post("/quiz/live/{code}/naechste")
def live_quiz_naechste(code: str, user=Depends(get_current_user),
                       db: sqlite3.Connection = Depends(get_db)):
    code = code.upper()
    quiz = db.execute(
        "SELECT * FROM live_quizze WHERE code=? AND lehrer_id=?", (code, user["id"])
    ).fetchone()
    if not quiz:
        raise HTTPException(404, "Quiz nicht gefunden oder keine Berechtigung")
    aufgaben = _json_mod.loads(quiz["aufgaben_json"] or "[]")
    new_nr = quiz["frage_nr"] + 1
    if new_nr >= len(aufgaben):
        db.execute(
            "UPDATE live_quizze SET status='beendet', beendet=datetime('now') WHERE code=?", (code,)
        )
        db.commit()
        return {"status": "beendet", "frage_nr": quiz["frage_nr"], "gesamt": len(aufgaben)}
    db.execute("UPDATE live_quizze SET frage_nr=? WHERE code=?", (new_nr, code))
    db.commit()
    return {"status": "laufend", "frage_nr": new_nr, "gesamt": len(aufgaben)}


@app.post("/quiz/live/{code}/stop")
def live_quiz_stop(code: str, user=Depends(get_current_user),
                   db: sqlite3.Connection = Depends(get_db)):
    code = code.upper()
    quiz = db.execute(
        "SELECT id FROM live_quizze WHERE code=? AND lehrer_id=?", (code, user["id"])
    ).fetchone()
    if not quiz:
        raise HTTPException(404, "Quiz nicht gefunden oder keine Berechtigung")
    db.execute(
        "UPDATE live_quizze SET status='beendet', beendet=datetime('now') WHERE code=?", (code,)
    )
    db.commit()
    return {"ok": True}


@app.post("/quiz/live/{code}/antwort")
def live_quiz_antwort(code: str, data: LiveAntwort,
                      db: sqlite3.Connection = Depends(get_db)):
    code = code.upper()
    # Rate-Limit pro session_id (60 Requests/Minute, NAT-sicher)
    _rate_check(data.session_id)
    # Session validieren + Timeout prüfen (10 Minuten Inaktivität)
    session = db.execute(
        "SELECT spieler, letzte_aktivitaet FROM live_quiz_teilnehmer WHERE session_id=? AND quiz_code=?",
        (data.session_id, code),
    ).fetchone()
    if not session:
        raise HTTPException(403, "Ungültige Session – bitte erneut beitreten")
    letzte = session["letzte_aktivitaet"]
    if letzte:
        from datetime import datetime as _dt
        try:
            delta = (_dt.utcnow() - _dt.fromisoformat(letzte)).total_seconds()
            if delta > 600:
                raise HTTPException(403, "Session abgelaufen – bitte erneut beitreten")
        except (ValueError, TypeError):
            pass
    spieler = session["spieler"]
    # Aktivität aktualisieren
    db.execute(
        "UPDATE live_quiz_teilnehmer SET letzte_aktivitaet=datetime('now') WHERE session_id=?",
        (data.session_id,),
    )

    quiz = db.execute(
        "SELECT * FROM live_quizze WHERE code=? AND status='laufend'", (code,)
    ).fetchone()
    if not quiz:
        raise HTTPException(404, "Quiz nicht aktiv")
    if quiz["frage_nr"] != data.frage_nr:
        raise HTTPException(400, "Frage bereits beendet")
    aufgaben = _json_mod.loads(quiz["aufgaben_json"] or "[]")
    if data.frage_nr >= len(aufgaben):
        raise HTTPException(400, "Ungültige Frage")

    frage = aufgaben[data.frage_nr]
    korrekt = int(data.antwort_idx == frage.get("richtig", -1))
    base_p = frage.get("punkte", 2)
    speed_bonus = 0
    if korrekt and data.zeit_ms > 0:
        limit_ms = frage.get("zeitlimit", 25) * 1000
        if data.zeit_ms < limit_ms:
            speed_bonus = int(base_p * 0.5 * max(0, 1 - data.zeit_ms / limit_ms))
    punkte = (base_p + speed_bonus) if korrekt else 0

    try:
        db.execute(
            "INSERT INTO live_quiz_antworten "
            "(quiz_code, spieler, frage_nr, antwort_idx, korrekt, punkte) VALUES (?,?,?,?,?,?) "
            "ON CONFLICT(quiz_code, spieler, frage_nr) DO NOTHING",
            (code, spieler, data.frage_nr, data.antwort_idx, korrekt, punkte)
        )
        db.commit()
    except Exception:
        pass
    return {"korrekt": bool(korrekt), "punkte": punkte, "speed_bonus": speed_bonus}


@app.get("/quiz/live/{code}/ergebnisse")
def live_quiz_ergebnisse(code: str, user=Depends(get_current_user),
                         db: sqlite3.Connection = Depends(get_db)):
    code = code.upper()
    quiz = db.execute("SELECT lehrer_id FROM live_quizze WHERE code=?", (code,)).fetchone()
    if not quiz:
        raise HTTPException(404, "Quiz nicht gefunden")
    if quiz["lehrer_id"] != user["id"]:
        raise HTTPException(403, "Nur der Ersteller dieses Quiz hat Zugriff auf die Ergebnisse")
    rows = db.execute("""
        SELECT spieler,
               SUM(punkte)  AS gesamt_punkte,
               SUM(korrekt) AS richtig,
               COUNT(*)     AS beantwortet
        FROM live_quiz_antworten
        WHERE quiz_code=?
        GROUP BY spieler
        ORDER BY gesamt_punkte DESC, richtig DESC
    """, (code,)).fetchall()
    return [dict(r) for r in rows]


# ══════════════════════════════════════════════════════════════════════════════
# STREAK-SYSTEM
# ══════════════════════════════════════════════════════════════════════════════

class StreakRecord(BaseModel):
    name: str
    quiz_code: Optional[str] = None

def _streak_badge(streak: int) -> str:
    if streak >= 30: return "trophy"
    if streak >= 14: return "flame2"
    if streak >= 7:  return "flame"
    if streak >= 3:  return "zap"
    return "check"

@app.post("/streak/record")
def streak_record(data: StreakRecord, db: sqlite3.Connection = Depends(get_db)):
    name = data.name.strip()[:40]
    if not name:
        raise HTTPException(400, "Name erforderlich")
    today = date.today().isoformat()
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    row = db.execute("SELECT * FROM schueler_streaks WHERE schueler_name=?", (name,)).fetchone()

    if not row:
        db.execute(
            "INSERT INTO schueler_streaks (schueler_name, quiz_code, current_streak, max_streak, last_completion_date) "
            "VALUES (?,?,1,1,?)",
            (name, data.quiz_code, today),
        )
        db.commit()
        return {"current_streak": 1, "max_streak": 1, "badge": _streak_badge(1), "neu": True}

    if row["last_completion_date"] == today:
        # Heute schon erledigt – kein Update
        return {"current_streak": row["current_streak"], "max_streak": row["max_streak"],
                "badge": _streak_badge(row["current_streak"]), "neu": False}

    if row["last_completion_date"] == yesterday:
        new_streak = row["current_streak"] + 1
    else:
        new_streak = 1  # Lücke → Reset

    new_max = max(new_streak, row["max_streak"])
    db.execute(
        "UPDATE schueler_streaks SET current_streak=?, max_streak=?, last_completion_date=?, "
        "quiz_code=?, aktualisiert=datetime('now') WHERE schueler_name=?",
        (new_streak, new_max, today, data.quiz_code, name),
    )
    db.commit()
    return {"current_streak": new_streak, "max_streak": new_max,
            "badge": _streak_badge(new_streak), "neu": True}


@app.get("/streak/{name}")
def streak_get(name: str, db: sqlite3.Connection = Depends(get_db)):
    row = db.execute("SELECT * FROM schueler_streaks WHERE schueler_name=?", (name.strip(),)).fetchone()
    if not row:
        return {"current_streak": 0, "max_streak": 0, "badge": _streak_badge(0), "last_date": None}
    # Prüfen ob Streak durch Inaktivität verfallen ist
    today = date.today().isoformat()
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    last = row["last_completion_date"]
    active = last and last >= yesterday
    current = row["current_streak"] if active else 0
    return {
        "current_streak": current,
        "max_streak": row["max_streak"],
        "badge": _streak_badge(current),
        "last_date": last,
        "days_until_reset": 1 if last == today else (0 if not active else 0),
    }


# ══════════════════════════════════════════════════════════════════════════════
# LEVEL-SYSTEM (Fachkompetenz pro Lernbereich)
# ══════════════════════════════════════════════════════════════════════════════

class LevelRecord(BaseModel):
    name: str
    lernbereich: str
    korrekt_count: int
    gesamt_count: int
    gesamt_aufgaben: int = 50

def _berechne_level(aufgaben_geloest: int, gesamt_aufgaben: int, genauigkeit: float) -> str:
    fortschritt = min(100.0, (aufgaben_geloest / max(1, gesamt_aufgaben)) * 100)
    score = (fortschritt * 0.6) + (genauigkeit * 0.4)
    if score >= 96: return "PLATIN"
    if score >= 81: return "ROT"
    if score >= 51: return "GOLD"
    if score >= 21: return "GRÜN"
    return "BLAU"

@app.post("/level/record")
def level_record(data: LevelRecord, db: sqlite3.Connection = Depends(get_db)):
    name = data.name.strip()[:40]
    lernbereich = data.lernbereich.strip()[:80]
    if not name or not lernbereich:
        raise HTTPException(400, "Name und Lernbereich erforderlich")
    if data.gesamt_count < 1:
        raise HTTPException(400, "gesamt_count muss >= 1 sein")

    row = db.execute(
        "SELECT * FROM lernbereich_niveau WHERE schueler_name=? AND lernbereich=?",
        (name, lernbereich),
    ).fetchone()

    today = date.today().isoformat()

    if not row:
        new_korrekt  = max(0, data.korrekt_count)
        new_gesamt   = data.gesamt_count
        new_gen      = round((new_korrekt / new_gesamt) * 100, 1)
        ga           = max(1, data.gesamt_aufgaben)
        level        = _berechne_level(new_gesamt, ga, new_gen)
        db.execute(
            "INSERT INTO lernbereich_niveau "
            "(id, schueler_name, lernbereich, aufgaben_geloest, gesamt_aufgaben, "
            " korrekte_antworten, genauigkeit, level, letzte_aktivitaet, erstellt_am) "
            "VALUES (?,?,?,?,?,?,?,?,?,?)",
            (secrets.token_hex(8), name, lernbereich, new_gesamt, ga,
             new_korrekt, new_gen, level, today, today),
        )
        db.commit()
        return {
            "level": level, "genauigkeit": new_gen,
            "aufgaben_geloest": new_gesamt, "gesamt_aufgaben": ga,
            "fortschritt": round(min(100.0, new_gesamt / ga * 100), 1),
        }

    new_korrekt  = row["korrekte_antworten"] + max(0, data.korrekt_count)
    new_gesamt   = row["aufgaben_geloest"]   + data.gesamt_count
    new_gen      = round((new_korrekt / new_gesamt) * 100, 1)
    ga           = max(row["gesamt_aufgaben"] or 1, data.gesamt_aufgaben)
    level        = _berechne_level(new_gesamt, ga, new_gen)
    db.execute(
        "UPDATE lernbereich_niveau SET aufgaben_geloest=?, korrekte_antworten=?, "
        "genauigkeit=?, level=?, gesamt_aufgaben=?, letzte_aktivitaet=? "
        "WHERE schueler_name=? AND lernbereich=?",
        (new_gesamt, new_korrekt, new_gen, level, ga, today, name, lernbereich),
    )
    db.commit()
    return {
        "level": level, "genauigkeit": new_gen,
        "aufgaben_geloest": new_gesamt, "gesamt_aufgaben": ga,
        "fortschritt": round(min(100.0, new_gesamt / ga * 100), 1),
    }

# Leaderboard VOR /{name} definieren (FastAPI matched in Reihenfolge)
@app.get("/level/leaderboard/{lernbereich}")
def level_leaderboard(
    lernbereich: str,
    user=Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    rows = db.execute(
        "SELECT schueler_name, level, genauigkeit, aufgaben_geloest, gesamt_aufgaben "
        "FROM lernbereich_niveau WHERE lernbereich=? "
        "ORDER BY genauigkeit DESC, aufgaben_geloest DESC LIMIT 20",
        (lernbereich,),
    ).fetchall()
    result = []
    for i, r in enumerate(rows):
        result.append({
            "platz": i + 1,
            "name": r["schueler_name"],
            "level": r["level"],
            "genauigkeit": r["genauigkeit"],
            "aufgaben_geloest": r["aufgaben_geloest"],
            "gesamt_aufgaben": r["gesamt_aufgaben"],
        })
    return result

@app.get("/level/{name}")
def level_get(name: str, db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute(
        "SELECT * FROM lernbereich_niveau WHERE schueler_name=? ORDER BY letzte_aktivitaet DESC",
        (name.strip(),),
    ).fetchall()
    return [dict(r) for r in rows]


# ══════════════════════════════════════════════════════════════════════════════
# LEHRER-STATISTIK-DASHBOARD (Phase 2.3)
# ══════════════════════════════════════════════════════════════════════════════

def _quiz_codes_fuer_klasse(db: sqlite3.Connection, lehrer_id: int, class_id: int) -> list:
    rows = db.execute(
        "SELECT code FROM live_quizze WHERE lehrer_id=? AND klasse_id=?",
        (lehrer_id, class_id)
    ).fetchall()
    return [r["code"] for r in rows]

def _empfehlung(lernbereich: str, genauigkeit: float) -> str:
    if genauigkeit < 10:
        return f"Grundlagen {lernbereich} wiederholen"
    elif genauigkeit < 20:
        return f"{lernbereich}: Einfache Aufgaben stellen"
    else:
        return f"{lernbereich}: Regelmäßig üben"


@app.get("/teacher/classroom/{class_id}/stats")
def classroom_stats(
    class_id: int,
    db: sqlite3.Connection = Depends(get_db),
    user = Depends(get_current_user),
):
    klasse = db.execute("SELECT name FROM klassen WHERE id=?", (class_id,)).fetchone()
    if not klasse:
        raise HTTPException(404, "Klasse nicht gefunden")

    codes = _quiz_codes_fuer_klasse(db, user["id"], class_id)
    if not codes:
        return {
            "className": klasse["name"], "schuelerAnzahl": 0,
            "durchschnittGenauigkeit": 0.0, "durchschnittStreak": 0.0,
            "streakLeader": None, "atRiskCount": 0, "lernbereichUebersicht": {},
        }

    ph = ",".join("?" * len(codes))

    spieler = [
        r["spieler"] for r in db.execute(
            f"SELECT DISTINCT spieler FROM live_quiz_teilnehmer WHERE quiz_code IN ({ph})", codes
        ).fetchall()
    ]

    acc_row  = db.execute(
        f"SELECT ROUND(AVG(korrekt)*100,1) AS avg FROM live_quiz_antworten WHERE quiz_code IN ({ph})", codes
    ).fetchone()
    avg_acc = float(acc_row["avg"] or 0)

    streak_leader = None
    avg_streak = 0.0
    if spieler:
        sph = ",".join("?" * len(spieler))
        sl = db.execute(
            f"SELECT schueler_name, current_streak FROM schueler_streaks "
            f"WHERE schueler_name IN ({sph}) ORDER BY current_streak DESC LIMIT 1", spieler
        ).fetchone()
        if sl:
            streak_leader = {"name": sl["schueler_name"], "streak": sl["current_streak"]}
        st = db.execute(
            f"SELECT ROUND(AVG(current_streak),1) AS avg FROM schueler_streaks WHERE schueler_name IN ({sph})", spieler
        ).fetchone()
        avg_streak = float(st["avg"] or 0)

    at_risk = db.execute(
        f"SELECT COUNT(*) AS n FROM (SELECT spieler FROM live_quiz_antworten WHERE quiz_code IN ({ph}) "
        f"GROUP BY spieler HAVING ROUND(AVG(korrekt)*100,1) < 30)", codes
    ).fetchone()

    lb_overview = {}
    if spieler:
        sph = ",".join("?" * len(spieler))
        for r in db.execute(
            f"SELECT lernbereich, ROUND(AVG(genauigkeit)*100,1) AS avg_gen "
            f"FROM lernbereich_niveau WHERE schueler_name IN ({sph}) GROUP BY lernbereich ORDER BY lernbereich",
            spieler
        ).fetchall():
            lb_overview[r["lernbereich"]] = round(float(r["avg_gen"] or 0), 1)

    return {
        "className":               klasse["name"],
        "schuelerAnzahl":          len(spieler),
        "durchschnittGenauigkeit": round(avg_acc, 1),
        "durchschnittStreak":      round(avg_streak, 1),
        "streakLeader":            streak_leader,
        "atRiskCount":             at_risk["n"] if at_risk else 0,
        "lernbereichUebersicht":   lb_overview,
    }


@app.get("/teacher/classroom/{class_id}/leaderboard")
def classroom_leaderboard(
    class_id: int,
    db: sqlite3.Connection = Depends(get_db),
    user = Depends(get_current_user),
):
    codes = _quiz_codes_fuer_klasse(db, user["id"], class_id)
    if not codes:
        return []

    ph = ",".join("?" * len(codes))
    rows = db.execute(
        f"""SELECT spieler,
               COUNT(*)                   AS gesamt_fragen,
               ROUND(AVG(korrekt)*100,1)  AS genauigkeit,
               SUM(punkte)                AS punkte
            FROM live_quiz_antworten WHERE quiz_code IN ({ph})
            GROUP BY spieler ORDER BY genauigkeit DESC, punkte DESC""",
        codes
    ).fetchall()
    if not rows:
        return []

    namen = [r["spieler"] for r in rows]
    sph   = ",".join("?" * len(namen))

    streak_map = {
        s["schueler_name"]: {"streak": s["current_streak"], "maxStreak": s["max_streak"]}
        for s in db.execute(
            f"SELECT schueler_name, current_streak, max_streak FROM schueler_streaks WHERE schueler_name IN ({sph})",
            namen
        ).fetchall()
    }
    level_map = {
        l["schueler_name"]: l["best_level"]
        for l in db.execute(
            f"SELECT schueler_name, MAX(level) AS best_level FROM lernbereich_niveau "
            f"WHERE schueler_name IN ({sph}) GROUP BY schueler_name", namen
        ).fetchall()
    }

    return [
        {
            "name":              r["spieler"],
            "gesamtGenauigkeit": round(float(r["genauigkeit"] or 0), 1),
            "gesamtLevel":       level_map.get(r["spieler"], "BLAU"),
            "streak":            streak_map.get(r["spieler"], {}).get("streak", 0),
            "maxStreak":         streak_map.get(r["spieler"], {}).get("maxStreak", 0),
            "punkteGesamt":      r["punkte"] or 0,
            "fragenGesamt":      r["gesamt_fragen"] or 0,
        }
        for r in rows
    ]


@app.get("/teacher/classroom/{class_id}/at-risk")
def classroom_at_risk(
    class_id: int,
    db: sqlite3.Connection = Depends(get_db),
    user = Depends(get_current_user),
):
    codes = _quiz_codes_fuer_klasse(db, user["id"], class_id)
    if not codes:
        return []

    ph = ",".join("?" * len(codes))
    at_risk_rows = db.execute(
        f"SELECT spieler, ROUND(AVG(korrekt)*100,1) AS acc "
        f"FROM live_quiz_antworten WHERE quiz_code IN ({ph}) "
        f"GROUP BY spieler HAVING acc < 30 ORDER BY acc ASC",
        codes
    ).fetchall()
    if not at_risk_rows:
        return []

    namen   = [r["spieler"] for r in at_risk_rows]
    acc_map = {r["spieler"]: float(r["acc"] or 0) for r in at_risk_rows}
    sph     = ",".join("?" * len(namen))

    lb_rows = db.execute(
        f"SELECT schueler_name, lernbereich, ROUND(genauigkeit*100,1) AS gen_pct, level "
        f"FROM lernbereich_niveau WHERE schueler_name IN ({sph}) ORDER BY genauigkeit ASC",
        namen
    ).fetchall()

    seen, result = set(), []
    for r in lb_rows:
        name = r["schueler_name"]
        if name in seen:
            continue
        seen.add(name)
        gen = float(r["gen_pct"] or 0)
        result.append({
            "name": name, "lernbereich": r["lernbereich"],
            "level": r["level"], "genauigkeit": gen,
            "empfehlung": _empfehlung(r["lernbereich"], gen),
        })
    for name in namen:
        if name not in seen:
            result.append({
                "name": name, "lernbereich": "–", "level": "BLAU",
                "genauigkeit": acc_map[name], "empfehlung": "Mehr Übung empfohlen",
            })
    return result


@app.get("/teacher/classroom/{class_id}/lernbereich-trends")
def classroom_lernbereich_trends(
    class_id: int,
    db: sqlite3.Connection = Depends(get_db),
    user = Depends(get_current_user),
):
    codes = _quiz_codes_fuer_klasse(db, user["id"], class_id)
    if not codes:
        return {}

    ph    = ",".join("?" * len(codes))
    spieler = [
        r["spieler"] for r in db.execute(
            f"SELECT DISTINCT spieler FROM live_quiz_teilnehmer WHERE quiz_code IN ({ph})", codes
        ).fetchall()
    ]
    if not spieler:
        return {}

    # Overall trend: letzte 7 Tage vs. 7–14 Tage
    vor_7  = (date.today() - timedelta(days=7)).isoformat()
    vor_14 = (date.today() - timedelta(days=14)).isoformat()
    recent = db.execute(
        f"SELECT ROUND(AVG(korrekt)*100,1) AS acc FROM live_quiz_antworten WHERE quiz_code IN ({ph}) AND ts >= ?",
        codes + [vor_7]
    ).fetchone()
    older = db.execute(
        f"SELECT ROUND(AVG(korrekt)*100,1) AS acc FROM live_quiz_antworten WHERE quiz_code IN ({ph}) AND ts >= ? AND ts < ?",
        codes + [vor_14, vor_7]
    ).fetchone()
    r_acc = float(recent["acc"] or 0) if recent and recent["acc"] is not None else None
    o_acc = float(older["acc"]  or 0) if older  and older["acc"]  is not None else None
    trend = round(r_acc - o_acc, 1) if (r_acc is not None and o_acc is not None) else 0

    sph = ",".join("?" * len(spieler))
    lb_rows = db.execute(
        f"SELECT lernbereich, ROUND(AVG(genauigkeit)*100,1) AS avg_gen, COUNT(*) AS n "
        f"FROM lernbereich_niveau WHERE schueler_name IN ({sph}) GROUP BY lernbereich ORDER BY lernbereich",
        spieler
    ).fetchall()

    return {
        r["lernbereich"]: {
            "trend":          trend,
            "avgGenauigkeit": round(float(r["avg_gen"] or 0), 1),
            "studentsEnrolled": r["n"],
        }
        for r in lb_rows
    }

# ── KI-Endpunkt (Claude API Proxy) ────────────────────────────────────────────
class KiRequest(BaseModel):
    prompt: str
    max_tokens: int = 600

@app.post("/ki/buchung")
async def ki_buchung(req: KiRequest, _=Depends(get_current_user)):
    """Leitet einen Prompt an die Anthropic Claude API weiter.
    Nur für eingeloggte Lehrer. Benötigt BW_ANTHROPIC_KEY in der Secrets-Datei."""
    if not ANTHROPIC_KEY:
        raise HTTPException(503, "KI nicht konfiguriert – BW_ANTHROPIC_KEY fehlt in /etc/buchungswerk/secrets")
    if len(req.prompt) > 12000:
        raise HTTPException(400, "Prompt zu lang (max. 12000 Zeichen)")
    async with httpx.AsyncClient(timeout=45.0) as client:
        r = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key":          ANTHROPIC_KEY,
                "anthropic-version":  "2023-06-01",
                "content-type":       "application/json",
            },
            json={
                "model":      "claude-haiku-4-5-20251001",
                "max_tokens": min(req.max_tokens, 1500),
                "messages":   [{"role": "user", "content": req.prompt}],
            },
        )
    if r.status_code != 200:
        raise HTTPException(502, f"Claude API Fehler {r.status_code}: {r.text[:200]}")
    data = r.json()
    # Token-Logging: Phase G BuchungsEngine – dokumentiert 95% Einsparnis
    usage = data.get("usage", {})
    input_t  = usage.get("input_tokens",  0)
    output_t = usage.get("output_tokens", 0)
    engine_mode = "ENGINE" if input_t < 500 else "FALLBACK"
    einsparnis = round((1 - input_t / 3000) * 100) if input_t < 3000 else 0
    print(f"[KI] {engine_mode} | input={input_t}t output={output_t}t | Einsparnis≈{einsparnis}% (Baseline 3000t)")
    return data
