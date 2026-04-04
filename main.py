"""
BuchungsWerk Backend – FastAPI + SQLite
Raspberry Pi / Home Server
"""

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import sqlite3, json, os, hashlib, secrets as _secrets, threading
from collections import defaultdict
from datetime import datetime, timedelta
import httpx
import jwt as pyjwt
import pyotp

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

    CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
        passwort_hash TEXT NOT NULL,
        vorname       TEXT NOT NULL DEFAULT '',
        nachname      TEXT NOT NULL DEFAULT '',
        schule        TEXT NOT NULL DEFAULT '',
        is_admin      INTEGER NOT NULL DEFAULT 0,
        erstellt      TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    """)
    conn.commit()
    # Migration: neue Spalten für bestehende DBs
    for col_sql in [
        "ALTER TABLE users ADD COLUMN is_admin      INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN lizenz_typ    TEXT    NOT NULL DEFAULT 'free'",
        "ALTER TABLE users ADD COLUMN lizenz_bis    TEXT    DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN notiz         TEXT    NOT NULL DEFAULT ''",
        "ALTER TABLE users ADD COLUMN letzter_login TEXT    DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN reset_token    TEXT    DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN reset_expires  TEXT    DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE users ADD COLUMN verify_token   TEXT    DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN verify_expires TEXT    DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN totp_secret    TEXT    DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN totp_enabled   INTEGER NOT NULL DEFAULT 0",
    ]:
        try:
            conn.execute(col_sql)
            conn.commit()
        except Exception:
            pass
    conn.close()

init_db()

# ── Rate-Limiter (In-Memory, thread-safe) ──────────────────────────────────────
class _RateLimiter:
    def __init__(self):
        self._buckets: dict = defaultdict(list)
        self._lock = threading.Lock()
    def check(self, key: str, max_req: int, window_sec: int) -> bool:
        now = datetime.utcnow()
        cutoff = now - timedelta(seconds=window_sec)
        with self._lock:
            self._buckets[key] = [t for t in self._buckets[key] if t > cutoff]
            if len(self._buckets[key]) >= max_req:
                return False
            self._buckets[key].append(now)
            return True

_rl = _RateLimiter()

# ── 2FA – Pending-Logins (In-Memory, 5 Min. TTL) ──────────────────────────────
_pending_2fa: dict = {}
_pending_lock = threading.Lock()

# ── Auth – JWT-Secret (persistent in DB, kein Env-Var nötig) ─────────────────
_JWT_ALGORITHM  = "HS256"
_JWT_EXPIRE_DAYS = 30
_jwt_secret_cache: Optional[str] = None

def _get_jwt_secret() -> str:
    global _jwt_secret_cache
    if _jwt_secret_cache:
        return _jwt_secret_cache
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute("SELECT value FROM settings WHERE key='jwt_secret'").fetchone()
        if row:
            _jwt_secret_cache = row["value"]
            return _jwt_secret_cache
        secret = _secrets.token_hex(32)
        conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('jwt_secret', ?)", (secret,))
        conn.commit()
        _jwt_secret_cache = secret
        return secret
    finally:
        conn.close()

# Passwort-Hashing via PBKDF2-HMAC-SHA256 (Python stdlib, kein bcrypt nötig)
_PBKDF2_ITER = 260_000

def _hash_pw(pw: str) -> str:
    salt = _secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), salt.encode("utf-8"), _PBKDF2_ITER).hex()
    return f"pbkdf2$sha256${_PBKDF2_ITER}${salt}${h}"

def _check_pw(pw: str, stored: str) -> bool:
    try:
        _, algo, iters, salt, stored_hash = stored.split("$")
        h = hashlib.pbkdf2_hmac(algo, pw.encode("utf-8"), salt.encode("utf-8"), int(iters)).hex()
        return _secrets.compare_digest(h, stored_hash)
    except Exception:
        return False

def _create_token(user_id: int) -> str:
    exp = datetime.utcnow() + timedelta(days=_JWT_EXPIRE_DAYS)
    return pyjwt.encode({"sub": str(user_id), "exp": exp}, _get_jwt_secret(), algorithm=_JWT_ALGORITHM)

def _decode_token(token: str) -> int:
    payload = pyjwt.decode(token, _get_jwt_secret(), algorithms=[_JWT_ALGORITHM])
    return int(payload["sub"])

def _user_dict(row) -> dict:
    d = dict(row)
    return {
        "id":           d["id"],
        "email":        d["email"],
        "vorname":      d["vorname"],
        "nachname":     d["nachname"],
        "schule":       d["schule"],
        "is_admin":     bool(d["is_admin"]),
        "lizenz_typ":   d.get("lizenz_typ", "free") or "free",
        "lizenz_bis":   d.get("lizenz_bis"),
        "notiz":        d.get("notiz", "") or "",
        "letzter_login":  d.get("letzter_login"),
        "email_verified": bool(d.get("email_verified", 1)),
        "totp_enabled":   bool(d.get("totp_enabled", 0)),
    }

# ── Auth – Schemas ─────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    passwort: str
    vorname: str
    nachname: Optional[str] = ""
    schule: Optional[str] = ""

class LoginRequest(BaseModel):
    email: str
    passwort: str

# ── Auth – Endpunkte ───────────────────────────────────────────────────────────
@app.post("/auth/register", status_code=201)
def auth_register(data: RegisterRequest, request: Request, db: sqlite3.Connection = Depends(get_db)):
    ip = request.client.host
    if not _rl.check(f"reg:{ip}", 5, 3600):
        raise HTTPException(429, detail="Zu viele Registrierungen von dieser IP. Bitte später versuchen.")
    email = data.email.strip().lower()
    if not data.vorname.strip():
        raise HTTPException(400, detail="Vorname ist erforderlich.")
    if "@" not in email or "." not in email.split("@", 1)[-1]:
        raise HTTPException(400, detail="Ungültige E-Mail-Adresse.")
    if len(data.passwort) < 8:
        raise HTTPException(400, detail="Das Passwort muss mindestens 8 Zeichen haben.")
    vorname = data.vorname.strip()
    verify_token = "%06d" % (_secrets.randbelow(1_000_000))
    verify_expires = (datetime.utcnow() + timedelta(minutes=30)).isoformat()
    pw_hash = _hash_pw(data.passwort)
    try:
        cur = db.execute(
            "INSERT INTO users (email, passwort_hash, vorname, nachname, schule, email_verified, verify_token, verify_expires) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
            (email, pw_hash, vorname,
             (data.nachname or "").strip(), (data.schule or "").strip(),
             verify_token, verify_expires)
        )
        db.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(409, detail="Diese E-Mail-Adresse ist bereits registriert.")
    uid = cur.lastrowid
    try:
        _smtp_send(
            email,
            "BuchungsWerk – E-Mail bestätigen",
            f"Hallo {vorname},\n\nDein Bestätigungscode: {verify_token}\n\nGültig 30 Minuten.\n\nBuchungsWerk",
            f"<html><body style='font-family:sans-serif;color:#222;max-width:480px;margin:auto'>"
            f"<h2 style='color:#e8600a'>BuchungsWerk – E-Mail bestätigen</h2>"
            f"<p>Hallo {vorname},</p>"
            f"<p>willkommen bei BuchungsWerk! Bestätige deine E-Mail-Adresse mit diesem Code:</p>"
            f"<div style='font-size:34px;font-weight:900;letter-spacing:.18em;color:#e8600a;"
            f"background:#fff8f0;border:2px solid #e8600a;border-radius:10px;"
            f"padding:14px 28px;display:inline-block;margin:8px 0'>{verify_token}</div>"
            f"<p style='color:#555'>Gültig für <strong>30 Minuten</strong>.</p>"
            f"<p style='color:#999;font-size:12px'>Falls du dich nicht registriert hast, ignoriere diese E-Mail.</p>"
            f"</body></html>"
        )
    except Exception as exc:
        db.execute("DELETE FROM users WHERE id=?", (uid,))
        db.commit()
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(502, detail="E-Mail konnte nicht gesendet werden. Bitte SMTP prüfen.")
    return {"requires_verify": True, "email": email}

@app.post("/auth/login")
def auth_login(data: LoginRequest, request: Request, db: sqlite3.Connection = Depends(get_db)):
    ip = request.client.host
    if not _rl.check(f"login:{ip}", 10, 900):
        raise HTTPException(429, detail="Zu viele Anmeldeversuche. Bitte 15 Minuten warten.")
    email = data.email.strip().lower()
    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if not user or not _check_pw(data.passwort, user["passwort_hash"]):
        raise HTTPException(401, detail="E-Mail oder Passwort falsch.")
    if not user["email_verified"]:
        raise HTTPException(403, detail="E-Mail nicht bestätigt. Bitte prüfe dein Postfach.")
    if user["totp_enabled"] and user["totp_secret"]:
        temp = _secrets.token_urlsafe(24)
        exp  = datetime.utcnow() + timedelta(minutes=5)
        with _pending_lock:
            _pending_2fa[temp] = {"user_id": user["id"], "expires": exp}
        return {"requires_2fa": True, "temp_token": temp}
    db.execute("UPDATE users SET letzter_login=? WHERE id=?",
               (datetime.utcnow().isoformat(), user["id"]))
    db.commit()
    user = db.execute("SELECT * FROM users WHERE id=?", (user["id"],)).fetchone()
    return {"token": _create_token(user["id"]), "user": _user_dict(user)}

@app.get("/auth/me")
def auth_me(request: Request, db: sqlite3.Connection = Depends(get_db)):
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise HTTPException(401, detail="Nicht angemeldet.")
    try:
        user_id = _decode_token(header[7:])
    except Exception:
        raise HTTPException(401, detail="Token ungültig oder abgelaufen.")
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        raise HTTPException(401, detail="Benutzer nicht gefunden.")
    return _user_dict(user)

# ── Auth – Profil & Passwort ───────────────────────────────────────────────────
class ProfileUpdateRequest(BaseModel):
    vorname: str
    nachname: Optional[str] = ""
    schule: Optional[str] = ""

class PasswordChangeRequest(BaseModel):
    altes_passwort: str
    neues_passwort: str

def _auth_user(request: Request, db: sqlite3.Connection) -> sqlite3.Row:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise HTTPException(401, detail="Nicht angemeldet.")
    try:
        user_id = _decode_token(header[7:])
    except Exception:
        raise HTTPException(401, detail="Token ungültig oder abgelaufen.")
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        raise HTTPException(401, detail="Benutzer nicht gefunden.")
    return user

@app.put("/auth/profile")
def auth_update_profile(data: ProfileUpdateRequest, request: Request, db: sqlite3.Connection = Depends(get_db)):
    if not data.vorname.strip():
        raise HTTPException(400, detail="Vorname ist erforderlich.")
    user = _auth_user(request, db)
    db.execute(
        "UPDATE users SET vorname=?, nachname=?, schule=? WHERE id=?",
        (data.vorname.strip(), (data.nachname or "").strip(), (data.schule or "").strip(), user["id"])
    )
    db.commit()
    updated = db.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    return _user_dict(updated)

@app.put("/auth/password")
def auth_change_password(data: PasswordChangeRequest, request: Request, db: sqlite3.Connection = Depends(get_db)):
    user = _auth_user(request, db)
    if not _check_pw(data.altes_passwort, user["passwort_hash"]):
        raise HTTPException(400, detail="Aktuelles Passwort ist falsch.")
    if len(data.neues_passwort) < 8:
        raise HTTPException(400, detail="Das neue Passwort muss mindestens 8 Zeichen haben.")
    db.execute("UPDATE users SET passwort_hash=? WHERE id=?", (_hash_pw(data.neues_passwort), user["id"]))
    db.commit()
    return {"ok": True}

# ── Passwort-Reset ─────────────────────────────────────────────────────────────
class PasswordResetRequestModel(BaseModel):
    email: str

class PasswordResetConfirmModel(BaseModel):
    email: str
    token: str
    neues_passwort: str

def _smtp_send(to_email: str, subject: str, text_body: str, html_body: str):
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    smtp_host = os.environ.get("BW_SMTP_HOST", "")
    smtp_port = int(os.environ.get("BW_SMTP_PORT", "587"))
    smtp_user = os.environ.get("BW_SMTP_USER", "")
    smtp_pass = os.environ.get("BW_SMTP_PASS", "")
    smtp_from = os.environ.get("BW_SMTP_FROM", smtp_user)
    if not smtp_host or not smtp_user:
        raise HTTPException(503, detail="SMTP nicht konfiguriert.")
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = smtp_from
    msg["To"]      = to_email
    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as srv:
        srv.starttls()
        srv.login(smtp_user, smtp_pass)
        srv.sendmail(smtp_from, [to_email], msg.as_string())

@app.post("/auth/reset-request")
def auth_reset_request(data: PasswordResetRequestModel,
                       db: sqlite3.Connection = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.execute("SELECT id, vorname FROM users WHERE email=?", (email,)).fetchone()
    if not user:
        return {"ok": True}  # kein Hinweis, ob E-Mail existiert
    token = "%06d" % (_secrets.randbelow(1_000_000))
    expires = (datetime.utcnow() + timedelta(minutes=15)).isoformat()
    db.execute("UPDATE users SET reset_token=?, reset_expires=? WHERE id=?",
               (token, expires, user["id"]))
    db.commit()
    try:
        _smtp_send(
            email,
            "BuchungsWerk – Passwort zurücksetzen",
            f"Hallo {user['vorname']},\n\nDein Reset-Code: {token}\n\nGültig 15 Minuten.\n\nBuchungsWerk",
            f"<html><body style='font-family:sans-serif;color:#222;max-width:480px;margin:auto'>"
            f"<h2 style='color:#e8600a'>BuchungsWerk – Passwort zurücksetzen</h2>"
            f"<p>Hallo {user['vorname']},</p>"
            f"<p>dein Reset-Code lautet:</p>"
            f"<div style='font-size:34px;font-weight:900;letter-spacing:.18em;color:#e8600a;"
            f"background:#fff8f0;border:2px solid #e8600a;border-radius:10px;"
            f"padding:14px 28px;display:inline-block;margin:8px 0'>{token}</div>"
            f"<p style='color:#555'>Gültig für <strong>15 Minuten</strong>.</p>"
            f"<p style='color:#999;font-size:12px'>Falls du kein Reset angefordert hast, ignoriere diese E-Mail.</p>"
            f"</body></html>"
        )
    except Exception as exc:
        raise HTTPException(502, detail=f"E-Mail konnte nicht gesendet werden: {exc}")
    return {"ok": True}

@app.post("/auth/reset-confirm")
def auth_reset_confirm(data: PasswordResetConfirmModel,
                       db: sqlite3.Connection = Depends(get_db)):
    email = data.email.strip().lower()
    if len(data.neues_passwort) < 8:
        raise HTTPException(400, detail="Das Passwort muss mindestens 8 Zeichen haben.")
    user = db.execute(
        "SELECT id, reset_token, reset_expires FROM users WHERE email=?", (email,)
    ).fetchone()
    if not user or not user["reset_token"]:
        raise HTTPException(400, detail="Ungültiger oder abgelaufener Code.")
    if user["reset_token"] != data.token.strip():
        raise HTTPException(400, detail="Falscher Code. Bitte erneut prüfen.")
    if user["reset_expires"] and datetime.fromisoformat(user["reset_expires"]) < datetime.utcnow():
        raise HTTPException(400, detail="Der Code ist abgelaufen. Bitte neu anfordern.")
    db.execute(
        "UPDATE users SET passwort_hash=?, reset_token=NULL, reset_expires=NULL WHERE id=?",
        (_hash_pw(data.neues_passwort), user["id"])
    )
    db.commit()
    return {"ok": True}

# ── E-Mail-Verifizierung ───────────────────────────────────────────────────────
class VerifyEmailRequest(BaseModel):
    email: str
    token: str

class ResendVerifyRequest(BaseModel):
    email: str

@app.post("/auth/verify-email")
def auth_verify_email(data: VerifyEmailRequest, request: Request, db: sqlite3.Connection = Depends(get_db)):
    ip = request.client.host
    if not _rl.check(f"verify:{ip}", 10, 3600):
        raise HTTPException(429, detail="Zu viele Versuche. Bitte später erneut versuchen.")
    email = data.email.strip().lower()
    user = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not user or not user["verify_token"]:
        raise HTTPException(400, detail="Ungültiger oder abgelaufener Code.")
    if user["verify_token"] != data.token.strip():
        raise HTTPException(400, detail="Falscher Code. Bitte erneut prüfen.")
    if user["verify_expires"] and datetime.fromisoformat(user["verify_expires"]) < datetime.utcnow():
        raise HTTPException(400, detail="Code abgelaufen. Bitte neuen Code anfordern.")
    db.execute(
        "UPDATE users SET email_verified=1, verify_token=NULL, verify_expires=NULL, letzter_login=? WHERE id=?",
        (datetime.utcnow().isoformat(), user["id"])
    )
    db.commit()
    user = db.execute("SELECT * FROM users WHERE id=?", (user["id"],)).fetchone()
    return {"token": _create_token(user["id"]), "user": _user_dict(user)}

@app.post("/auth/resend-verify")
def auth_resend_verify(data: ResendVerifyRequest, request: Request, db: sqlite3.Connection = Depends(get_db)):
    ip = request.client.host
    if not _rl.check(f"resend:{ip}", 3, 3600):
        raise HTTPException(429, detail="Zu viele Versuche. Bitte später erneut versuchen.")
    email = data.email.strip().lower()
    user = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not user or user["email_verified"]:
        return {"ok": True}   # kein Hinweis, ob E-Mail existiert
    verify_token = "%06d" % (_secrets.randbelow(1_000_000))
    verify_expires = (datetime.utcnow() + timedelta(minutes=30)).isoformat()
    db.execute("UPDATE users SET verify_token=?, verify_expires=? WHERE id=?",
               (verify_token, verify_expires, user["id"]))
    db.commit()
    try:
        _smtp_send(
            email,
            "BuchungsWerk – Neuer Bestätigungscode",
            f"Hallo {user['vorname']},\n\nDein neuer Code: {verify_token}\n\nGültig 30 Minuten.\n\nBuchungsWerk",
            f"<html><body style='font-family:sans-serif;color:#222;max-width:480px;margin:auto'>"
            f"<h2 style='color:#e8600a'>Neuer Bestätigungscode</h2>"
            f"<p>Hallo {user['vorname']},</p>"
            f"<div style='font-size:34px;font-weight:900;letter-spacing:.18em;color:#e8600a;"
            f"background:#fff8f0;border:2px solid #e8600a;border-radius:10px;"
            f"padding:14px 28px;display:inline-block;margin:8px 0'>{verify_token}</div>"
            f"<p style='color:#555'>Gültig für <strong>30 Minuten</strong>.</p>"
            f"</body></html>"
        )
    except Exception as exc:
        raise HTTPException(502, detail=f"E-Mail konnte nicht gesendet werden: {exc}")
    return {"ok": True}

# ── 2-Faktor-Authentifizierung (TOTP) ─────────────────────────────────────────
class TotpLoginRequest(BaseModel):
    temp_token: str
    code: str

class TotpEnableRequest(BaseModel):
    code: str

class TotpDisableRequest(BaseModel):
    passwort: str

@app.post("/auth/totp/login")
def auth_totp_login(data: TotpLoginRequest, request: Request, db: sqlite3.Connection = Depends(get_db)):
    ip = request.client.host
    if not _rl.check(f"totp:{ip}", 10, 300):
        raise HTTPException(429, detail="Zu viele Versuche.")
    with _pending_lock:
        entry = _pending_2fa.pop(data.temp_token, None)
    if not entry or entry["expires"] < datetime.utcnow():
        raise HTTPException(401, detail="Sitzung abgelaufen. Bitte erneut anmelden.")
    user = db.execute("SELECT * FROM users WHERE id=?", (entry["user_id"],)).fetchone()
    if not user or not user["totp_secret"]:
        raise HTTPException(401, detail="2FA nicht konfiguriert.")
    if not pyotp.TOTP(user["totp_secret"]).verify(data.code.strip(), valid_window=1):
        raise HTTPException(401, detail="Falscher Authentifizierungscode.")
    db.execute("UPDATE users SET letzter_login=? WHERE id=?",
               (datetime.utcnow().isoformat(), user["id"]))
    db.commit()
    user = db.execute("SELECT * FROM users WHERE id=?", (user["id"],)).fetchone()
    return {"token": _create_token(user["id"]), "user": _user_dict(user)}

@app.post("/auth/totp/setup")
def auth_totp_setup(request: Request, db: sqlite3.Connection = Depends(get_db)):
    user = _auth_user(request, db)
    secret = pyotp.random_base32()
    uri = pyotp.TOTP(secret).provisioning_uri(name=user["email"], issuer_name="BuchungsWerk")
    db.execute("UPDATE users SET totp_secret=? WHERE id=?", (secret, user["id"]))
    db.commit()
    return {"secret": secret, "uri": uri}

@app.post("/auth/totp/enable")
def auth_totp_enable(data: TotpEnableRequest, request: Request, db: sqlite3.Connection = Depends(get_db)):
    user = _auth_user(request, db)
    if not user["totp_secret"]:
        raise HTTPException(400, detail="Bitte zuerst Setup aufrufen.")
    if not pyotp.TOTP(user["totp_secret"]).verify(data.code.strip(), valid_window=1):
        raise HTTPException(400, detail="Falscher Code. Bitte Authenticator-App prüfen.")
    db.execute("UPDATE users SET totp_enabled=1 WHERE id=?", (user["id"],))
    db.commit()
    return {"ok": True}

@app.post("/auth/totp/disable")
def auth_totp_disable(data: TotpDisableRequest, request: Request, db: sqlite3.Connection = Depends(get_db)):
    user = _auth_user(request, db)
    if not _check_pw(data.passwort, user["passwort_hash"]):
        raise HTTPException(400, detail="Passwort falsch.")
    db.execute("UPDATE users SET totp_enabled=0, totp_secret=NULL WHERE id=?", (user["id"],))
    db.commit()
    return {"ok": True}

# ── Admin ──────────────────────────────────────────────────────────────────────
@app.get("/admin/users")
def admin_list_users(request: Request, db: sqlite3.Connection = Depends(get_db)):
    user = _auth_user(request, db)
    if not user["is_admin"]:
        raise HTTPException(403, detail="Kein Admin-Zugriff.")
    rows = db.execute(
        "SELECT id, email, vorname, nachname, schule, is_admin, erstellt FROM users ORDER BY erstellt DESC"
    ).fetchall()
    return [dict(r) for r in rows]

@app.delete("/admin/users/{uid}", status_code=204)
def admin_delete_user(uid: int, request: Request, db: sqlite3.Connection = Depends(get_db)):
    user = _auth_user(request, db)
    if not user["is_admin"]:
        raise HTTPException(403, detail="Kein Admin-Zugriff.")
    if uid == user["id"]:
        raise HTTPException(400, detail="Du kannst dich nicht selbst löschen.")
    db.execute("DELETE FROM users WHERE id = ?", (uid,))
    db.commit()

@app.patch("/admin/users/{uid}/admin")
def admin_toggle_admin(uid: int, request: Request, db: sqlite3.Connection = Depends(get_db)):
    user = _auth_user(request, db)
    if not user["is_admin"]:
        raise HTTPException(403, detail="Kein Admin-Zugriff.")
    target = db.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
    if not target:
        raise HTTPException(404, detail="Benutzer nicht gefunden.")
    new_val = 0 if target["is_admin"] else 1
    db.execute("UPDATE users SET is_admin=? WHERE id=?", (new_val, uid))
    db.commit()
    return {"is_admin": bool(new_val)}

@app.get("/admin/stats")
def admin_stats(request: Request, db: sqlite3.Connection = Depends(get_db)):
    user = _auth_user(request, db)
    if not user["is_admin"]:
        raise HTTPException(403, detail="Kein Admin-Zugriff.")
    cutoff = (datetime.utcnow() - timedelta(days=30)).isoformat()
    total  = db.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    active = db.execute("SELECT COUNT(*) FROM users WHERE letzter_login >= ?", (cutoff,)).fetchone()[0]
    rows   = db.execute("SELECT lizenz_typ, COUNT(*) cnt FROM users GROUP BY lizenz_typ").fetchall()
    by_liz = {r["lizenz_typ"]: r["cnt"] for r in rows}
    return {
        "total": total, "active_30d": active,
        "free":   by_liz.get("free",   0),
        "pro":    by_liz.get("pro",    0),
        "schule": by_liz.get("schule", 0),
    }

@app.get("/admin/smtp/status")
def admin_smtp_status(request: Request, db: sqlite3.Connection = Depends(get_db)):
    user = _auth_user(request, db)
    if not user["is_admin"]:
        raise HTTPException(403, detail="Kein Admin-Zugriff.")
    return {
        "configured": bool(os.environ.get("BW_SMTP_HOST") and os.environ.get("BW_SMTP_USER")),
        "from_addr":  os.environ.get("BW_SMTP_FROM", os.environ.get("BW_SMTP_USER", "")),
    }

class LizenzUpdateRequest(BaseModel):
    lizenz_typ: str
    lizenz_bis: Optional[str] = None
    notiz: Optional[str] = ""

@app.patch("/admin/users/{uid}/lizenz")
def admin_update_lizenz(uid: int, data: LizenzUpdateRequest,
                        request: Request, db: sqlite3.Connection = Depends(get_db)):
    user = _auth_user(request, db)
    if not user["is_admin"]:
        raise HTTPException(403, detail="Kein Admin-Zugriff.")
    if data.lizenz_typ not in ("free", "pro", "schule"):
        raise HTTPException(400, detail="Ungültiger Lizenztyp. Erlaubt: free, pro, schule.")
    db.execute(
        "UPDATE users SET lizenz_typ=?, lizenz_bis=?, notiz=? WHERE id=?",
        (data.lizenz_typ, data.lizenz_bis or None, data.notiz or "", uid)
    )
    db.commit()
    target = db.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    if not target:
        raise HTTPException(404, detail="Benutzer nicht gefunden.")
    return _user_dict(target)

class AdminEmailRequest(BaseModel):
    betreff: str
    nachricht: str

@app.post("/admin/users/{uid}/email")
def admin_send_email(uid: int, data: AdminEmailRequest,
                     request: Request, db: sqlite3.Connection = Depends(get_db)):
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    user = _auth_user(request, db)
    if not user["is_admin"]:
        raise HTTPException(403, detail="Kein Admin-Zugriff.")
    target = db.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    if not target:
        raise HTTPException(404, detail="Benutzer nicht gefunden.")
    smtp_host = os.environ.get("BW_SMTP_HOST", "")
    smtp_port = int(os.environ.get("BW_SMTP_PORT", "587"))
    smtp_user = os.environ.get("BW_SMTP_USER", "")
    smtp_pass = os.environ.get("BW_SMTP_PASS", "")
    smtp_from = os.environ.get("BW_SMTP_FROM", smtp_user)
    if not smtp_host or not smtp_user:
        raise HTTPException(503,
            detail="SMTP nicht konfiguriert. Setze BW_SMTP_HOST, BW_SMTP_USER und BW_SMTP_PASS.")
    msg = MIMEMultipart("alternative")
    msg["Subject"] = data.betreff
    msg["From"]    = smtp_from
    msg["To"]      = target["email"]
    html_body = data.nachricht.replace("\n", "<br>")
    msg.attach(MIMEText(data.nachricht, "plain", "utf-8"))
    msg.attach(MIMEText(
        f"<html><body style='font-family:sans-serif;color:#222'>{html_body}</body></html>",
        "html", "utf-8"
    ))
    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as srv:
            srv.starttls()
            srv.login(smtp_user, smtp_pass)
            srv.sendmail(smtp_from, [target["email"]], msg.as_string())
    except Exception as exc:
        raise HTTPException(502, detail=f"E-Mail-Versand fehlgeschlagen: {exc}")
    return {"ok": True}

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
async def ki_buchung(data: KiBuchungRequest, request: Request, db: sqlite3.Connection = Depends(get_db)):
    ip = request.client.host
    if not _rl.check(f"ki:{ip}", 10, 60):
        raise HTTPException(429, detail="Zu viele Anfragen. Bitte 1 Minute warten.")
    _auth_user(request, db)
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
        "from": "BuchungsWerk <info@buchungswerk.org>",
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
