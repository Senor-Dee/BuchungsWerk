"""
BuchungsWerk Backend – FastAPI + SQLite + JWT-Auth
Raspberry Pi / Home Server
"""

from fastapi import FastAPI, HTTPException, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import sqlite3, os, secrets, random, string, html
from datetime import datetime, timedelta, timezone, date

import bcrypt
import jwt
import pyotp
import httpx
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# ── Config ─────────────────────────────────────────────────────────────────────
JWT_SECRET      = os.environ.get("BW_JWT_SECRET", "change-me-in-production")
JWT_ALGO        = "HS256"
JWT_EXPIRE_DAYS = 7
RESEND_KEY      = os.environ.get("RESEND_API_KEY", "")
FROM_EMAIL      = os.environ.get("BW_FROM_EMAIL", "BuchungsWerk <noreply@buchungswerk.org>")
ADMIN_EMAIL     = os.environ.get("BW_ADMIN_EMAIL", "")
APP_URL         = os.environ.get("BW_APP_URL", "https://buchungswerk.org")
DB_PATH         = os.environ.get("BW_DB", "buchungswerk.db")
REQUIRE_VERIFY  = os.environ.get("BW_REQUIRE_VERIFY", "true").lower() == "true" and bool(RESEND_KEY)
ANTHROPIC_KEY    = os.environ.get("BW_ANTHROPIC_KEY", "")
PAYPAL_CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID", "")
PAYPAL_SECRET    = os.environ.get("PAYPAL_SECRET", "")
PAYPAL_BASE_URL  = "https://api.sandbox.paypal.com" if os.environ.get("PAYPAL_MODE", "sandbox") == "sandbox" else "https://api.paypal.com"
STRIPE_API_KEY          = os.environ.get("STRIPE_API_KEY", "")
STRIPE_WEBHOOK_SECRET   = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_MONTHLY    = os.environ.get("STRIPE_PRICE_MONTHLY", "")   # price_... für 4,99€/Monat
STRIPE_PRICE_YEARLY     = os.environ.get("STRIPE_PRICE_YEARLY", "")    # price_... für 50€/Jahr
PAYPAL_PLAN_ID_MONTHLY  = os.environ.get("PAYPAL_PLAN_ID_MONTHLY", "")  # PayPal Billing Plan ID (P-...)
PAYPAL_WEBHOOK_ID       = os.environ.get("PAYPAL_WEBHOOK_ID", "")       # Webhook-Signaturverifikation
# Geschäftsdaten (Platzhalter bis Gewerbeanmeldung)
BW_BUSINESS_NAME    = os.environ.get("BW_BUSINESS_NAME",    "")  # z.B. "Anton Gebert – BuchungsWerk"
BW_BUSINESS_ADDRESS = os.environ.get("BW_BUSINESS_ADDRESS", "")  # z.B. "Musterstr. 1, 12345 Musterstadt"
BW_BUSINESS_IBAN    = os.environ.get("BW_BUSINESS_IBAN",    "")  # z.B. "DE89 3704 0044 0532 0130 00"
BW_BUSINESS_BIC     = os.environ.get("BW_BUSINESS_BIC",     "")  # z.B. "COBADEFFXXX"
BW_STEUERNUMMER     = os.environ.get("BW_STEUERNUMMER",     "")  # z.B. "123/456/78901"

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="BuchungsWerk API",
    version="2.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

CORS_ORIGINS = ["https://buchungswerk.org", "https://www.buchungswerk.org", "http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # iOS-Fix: wildcard erlaubt (kein Credential-Modus → sicher)
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Rate limiter – verwendet echte Client-IP aus X-Forwarded-For (Cloudflare)
# damit nicht alle User hinter Docker-Bridge dieselbe IP teilen.
def real_client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[0].strip()
    cf_ip = request.headers.get("cf-connecting-ip", "")
    if cf_ip:
        return cf_ip.strip()
    return request.client.host if request.client else "unknown"

limiter = Limiter(key_func=real_client_ip)
app.state.limiter = limiter

# Rate-Limit-Handler mit CORS-Headern (damit Browser kein "Load failed" sieht)
def cors_rate_limit_handler(request: Request, exc):
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=429,
        content={"detail": "Zu viele Anfragen – bitte kurz warten und erneut versuchen."},
        headers={"access-control-allow-origin": "*"},
    )

app.add_exception_handler(RateLimitExceeded, cors_rate_limit_handler)

# Globaler OPTIONS-Handler – fängt ALLE Preflight-Anfragen ab, bevor der
# Rate-Limiter oder Route-Handler greift (verhindert 400/405 für OPTIONS).
@app.options("/{full_path:path}")
async def global_options(full_path: str, request: Request):
    from fastapi.responses import Response
    origin = request.headers.get("origin") or "*"
    headers = {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD",
        "access-control-allow-headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
        "access-control-max-age": "86400",
        "vary": "Origin",
    }
    if request.headers.get("access-control-request-private-network"):
        headers["access-control-allow-private-network"] = "true"
    return Response(status_code=200, headers=headers)

security_scheme = HTTPBearer(auto_error=False)

# ── DB ─────────────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
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
    CREATE TABLE IF NOT EXISTS payment_orders (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id    TEXT UNIQUE NOT NULL,
        user_id     INTEGER NOT NULL REFERENCES users(id),
        status      TEXT DEFAULT 'CREATED',
        created_at  TEXT DEFAULT (datetime('now')),
        captured_at TEXT
    );
    CREATE TABLE IF NOT EXISTS payment_subscriptions (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id              INTEGER NOT NULL REFERENCES users(id),
        subscription_id      TEXT UNIQUE NOT NULL,
        plan_type            TEXT NOT NULL DEFAULT 'pro_monthly',
        provider             TEXT NOT NULL DEFAULT 'stripe',
        status               TEXT NOT NULL DEFAULT 'active',
        amount_eur           REAL NOT NULL DEFAULT 4.99,
        interval             TEXT NOT NULL DEFAULT 'month',
        stripe_customer_id   TEXT,
        current_period_end   TEXT,
        cancelled_at         TEXT,
        paused_at            TEXT,
        created_at           TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS webhook_logs (
        id           TEXT PRIMARY KEY,
        provider     TEXT NOT NULL,
        event_type   TEXT NOT NULL,
        processed_at TEXT DEFAULT (datetime('now')),
        result       TEXT
    );
    CREATE TABLE IF NOT EXISTS invoices (
        invoice_number   TEXT PRIMARY KEY,          -- BW-2026-04-0001
        user_id          INTEGER NOT NULL REFERENCES users(id),
        amount_eur       REAL NOT NULL DEFAULT 4.99,
        plan_type        TEXT NOT NULL DEFAULT 'pro_monthly',
        status           TEXT NOT NULL DEFAULT 'pending', -- pending | paid | expired
        created_at       TEXT DEFAULT (datetime('now')),
        due_date         TEXT NOT NULL,                    -- created_at + 14 Tage
        paid_at          TEXT,
        confirmed_by     INTEGER REFERENCES users(id),    -- Admin der bestätigt hat
        payment_reference TEXT NOT NULL                   -- = invoice_number (Verwendungszweck)
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
        # Datenschutz-Fix: user_id in alle Daten-Tabellen
        "ALTER TABLE materialien   ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE",
        "ALTER TABLE klassen       ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE",
        "ALTER TABLE quiz_sessions ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL",
        "ALTER TABLE users ADD COLUMN active_subscription_id TEXT",
        "ALTER TABLE payment_subscriptions ADD COLUMN paypal_plan_id TEXT",
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

import re as _re

_EMAIL_RE = _re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")

def _validate_registration(vorname: str, nachname: str, email: str, passwort: str):
    """Wirft HTTPException bei ungültigen Registrierungsdaten."""
    if not vorname.strip() or len(vorname.strip()) < 2:
        raise HTTPException(400, "Vorname muss mindestens 2 Zeichen haben")
    if not nachname.strip() or len(nachname.strip()) < 2:
        raise HTTPException(400, "Nachname muss mindestens 2 Zeichen haben")
    if not _EMAIL_RE.match(email):
        raise HTTPException(400, "Ungültige E-Mail-Adresse")
    if len(passwort) < 8:
        raise HTTPException(400, "Passwort muss mindestens 8 Zeichen haben")
    if not _re.search(r"[A-Z]", passwort):
        raise HTTPException(400, "Passwort muss mindestens einen Großbuchstaben enthalten")
    if not _re.search(r"[0-9]", passwort):
        raise HTTPException(400, "Passwort muss mindestens eine Zahl enthalten")
    if not _re.search(r"[^a-zA-Z0-9]", passwort):
        raise HTTPException(400, "Passwort muss mindestens ein Sonderzeichen enthalten (z. B. !, @, #, $)")


@app.post("/auth/register", status_code=201)
@limiter.limit("20/minute")
def register(request: Request, data: RegisterReq, background_tasks: BackgroundTasks, db: sqlite3.Connection = Depends(get_db)):
    email = data.email.strip().lower()
    _validate_registration(data.vorname, data.nachname, email, data.passwort)

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
        background_tasks.add_task(send_email, email, "BuchungsWerk – E-Mail bestätigen",
            f"<p>Hallo {data.vorname},</p>"
            f"<p>dein Bestätigungscode: <strong style='font-size:22px;letter-spacing:4px'>{code}</strong></p>"
            f"<p>Gültig für 1 Stunde.</p>")
        return {"requires_verify": True}

    return {"token": make_token(user_id, bool(is_admin_val)), "user": user_out(row)}


@app.post("/auth/login")
@limiter.limit("10/minute")
def login(request: Request, data: LoginReq, db: sqlite3.Connection = Depends(get_db)):
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
@limiter.limit("10/minute")
def totp_login(request: Request, data: TotpLoginReq, db: sqlite3.Connection = Depends(get_db)):
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
def resend_verify(data: ResendVerifyReq, background_tasks: BackgroundTasks, db: sqlite3.Connection = Depends(get_db)):
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
    background_tasks.add_task(send_email, email, "BuchungsWerk – Neuer Bestätigungscode",
        f"<p>Hallo {user['vorname']},</p>"
        f"<p>dein neuer Bestätigungscode: <strong style='font-size:22px;letter-spacing:4px'>{code}</strong></p>"
        f"<p>Gültig für 1 Stunde.</p>")
    return {"ok": True}


@app.post("/auth/reset-request")
@limiter.limit("3/minute")
def reset_request(request: Request, data: ResetRequestReq, background_tasks: BackgroundTasks, db: sqlite3.Connection = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.execute("SELECT * FROM users WHERE email=? AND ist_aktiv=1", (email,)).fetchone()
    if user:
        user = dict(user)
        code = _six_digit_code()
        exp = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
        db.execute("INSERT INTO token_store (user_id, token, typ, abgelaufen) VALUES (?,?,?,?)",
                   (user["id"], code, "reset", exp))
        db.commit()
        background_tasks.add_task(send_email, email, "BuchungsWerk – Passwort zurücksetzen",
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
    total      = db.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    active_30d = db.execute(
        "SELECT COUNT(*) FROM users WHERE letzter_login >= date('now','-30 days')"
    ).fetchone()[0]
    free       = db.execute("SELECT COUNT(*) FROM users WHERE lizenz_typ='free'").fetchone()[0]
    pro        = db.execute("SELECT COUNT(*) FROM users WHERE lizenz_typ='pro'").fetchone()[0]
    schule     = db.execute("SELECT COUNT(*) FROM users WHERE lizenz_typ='schule'").fetchone()[0]
    return {"total": total, "active_30d": active_30d, "free": free, "pro": pro, "schule": schule}


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
        f"<p>{html.escape(data.nachricht).replace(chr(10), '<br>')}</p>"
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
def list_klassen(db: sqlite3.Connection = Depends(get_db), user=Depends(get_current_user)):
    return [dict(r) for r in db.execute(
        "SELECT * FROM klassen WHERE user_id=? ORDER BY stufe, name",
        (user["id"],)
    ).fetchall()]

@app.post("/klassen", status_code=201)
def create_klasse(data: KlasseCreate, db: sqlite3.Connection = Depends(get_db),
                  user=Depends(get_current_user)):
    try:
        cur = db.execute("INSERT INTO klassen (name,stufe,schuljahr,user_id) VALUES (?,?,?,?)",
                         (data.name, data.stufe, data.schuljahr, user["id"]))
        db.commit()
        return {"id": cur.lastrowid, **data.model_dump()}
    except sqlite3.IntegrityError:
        raise HTTPException(400, f"Klasse '{data.name}' existiert bereits")

@app.delete("/klassen/{id}", status_code=204)
def delete_klasse(id: int, db: sqlite3.Connection = Depends(get_db), user=Depends(get_current_user)):
    row = db.execute("SELECT user_id FROM klassen WHERE id=?", (id,)).fetchone()
    if not row: raise HTTPException(404, "Klasse nicht gefunden")
    if row["user_id"] != user["id"]:
        raise HTTPException(403, "Keine Berechtigung")
    db.execute("DELETE FROM klassen WHERE id=?", (id,)); db.commit()

class SchuelerCreate(BaseModel):
    klasse_id: int
    vorname: str
    nachname: str
    kuerzel: Optional[str] = None

def _check_klasse_owner(klasse_id: int, user_id: int, db: sqlite3.Connection):
    """Stellt sicher, dass die Klasse dem Nutzer gehört."""
    row = db.execute("SELECT user_id FROM klassen WHERE id=?", (klasse_id,)).fetchone()
    if not row: raise HTTPException(404, "Klasse nicht gefunden")
    if row["user_id"] != user_id:
        raise HTTPException(403, "Keine Berechtigung")

@app.get("/klassen/{klasse_id}/schueler")
def list_schueler(klasse_id: int, db: sqlite3.Connection = Depends(get_db),
                  user=Depends(get_current_user)):
    _check_klasse_owner(klasse_id, user["id"], db)
    rows = db.execute(
        "SELECT * FROM schueler WHERE klasse_id=? ORDER BY nachname, vorname", (klasse_id,)
    ).fetchall()
    return [dict(r) for r in rows]

@app.post("/schueler", status_code=201)
def create_schueler(data: SchuelerCreate, db: sqlite3.Connection = Depends(get_db),
                    user=Depends(get_current_user)):
    _check_klasse_owner(data.klasse_id, user["id"], db)
    cur = db.execute("INSERT INTO schueler (klasse_id,vorname,nachname,kuerzel) VALUES (?,?,?,?)",
                     (data.klasse_id, data.vorname, data.nachname, data.kuerzel))
    db.commit()
    return {"id": cur.lastrowid, **data.model_dump()}

@app.delete("/schueler/{id}", status_code=204)
def delete_schueler(id: int, db: sqlite3.Connection = Depends(get_db), user=Depends(get_current_user)):
    row = db.execute(
        "SELECT k.user_id FROM schueler s JOIN klassen k ON k.id=s.klasse_id WHERE s.id=?", (id,)
    ).fetchone()
    if not row: raise HTTPException(404, "Schüler nicht gefunden")
    if row["user_id"] != user["id"]:
        raise HTTPException(403, "Keine Berechtigung")
    db.execute("DELETE FROM schueler WHERE id=?", (id,)); db.commit()

class SessionCreate(BaseModel):
    klasse_id: Optional[int] = None
    schueler_id: Optional[int] = None
    titel: Optional[str] = None
    klasse_stufe: Optional[int] = None
    pruefungsart: Optional[str] = None
    config_json: Optional[str] = None

@app.post("/sessions", status_code=201)
def create_session(data: SessionCreate, db: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    cur = db.execute(
        "INSERT INTO quiz_sessions (klasse_id,schueler_id,titel,klasse_stufe,pruefungsart,config_json,user_id) VALUES (?,?,?,?,?,?,?)",
        (data.klasse_id, data.schueler_id, data.titel, data.klasse_stufe, data.pruefungsart, data.config_json, current_user["id"])
    )
    db.commit()
    return {"id": cur.lastrowid, "gestartet": datetime.now().isoformat()}

@app.post("/sessions/{id}/abschliessen")
def session_abschliessen(id: int, db: sqlite3.Connection = Depends(get_db)):
    db.execute("UPDATE quiz_sessions SET beendet=datetime('now') WHERE id=?", (id,))
    db.commit(); return {"ok": True}

@app.get("/sessions/{id}/zusammenfassung")
def session_zusammenfassung(id: int, db: sqlite3.Connection = Depends(get_db),
                             user=Depends(get_current_user)):
    session = db.execute("SELECT * FROM quiz_sessions WHERE id=?", (id,)).fetchone()
    if not session: raise HTTPException(404, "Session nicht gefunden")
    s = dict(session)
    if s.get("user_id") is not None and s.get("user_id") != user["id"]:
        raise HTTPException(403, "Keine Berechtigung")
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
def create_ergebnis(data: ErgebnisCreate, db: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    cur = db.execute(
        "INSERT INTO ergebnisse (session_id,frage_nr,frage_typ,punkte,max_punkte,korrekt,antwort_json) VALUES (?,?,?,?,?,?,?)",
        (data.session_id, data.frage_nr, data.frage_typ, data.punkte, data.max_punkte,
         int(data.korrekt), data.antwort_json)
    )
    db.commit(); return {"id": cur.lastrowid}

@app.get("/klassen/{klasse_id}/statistik")
def klassen_statistik(klasse_id: int, db: sqlite3.Connection = Depends(get_db),
                      user=Depends(get_current_user)):
    _check_klasse_owner(klasse_id, user["id"], db)
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
def list_materialien(stufe: Optional[int] = None, db: sqlite3.Connection = Depends(get_db),
                     user=Depends(get_current_user)):
    base = ("SELECT id,titel,jahrgangsstufe,typ,pruefungsart,firma_name,firma_icon,gesamt_punkte,erstellt "
            "FROM materialien WHERE user_id=?")
    if stufe:
        rows = db.execute(base + " AND jahrgangsstufe=? ORDER BY erstellt DESC",
                          (user["id"], stufe)).fetchall()
    else:
        rows = db.execute(base + " ORDER BY jahrgangsstufe, erstellt DESC",
                          (user["id"],)).fetchall()
    return [dict(r) for r in rows]

@app.get("/materialien/{id}")
def get_material(id: int, db: sqlite3.Connection = Depends(get_db),
                 user=Depends(get_current_user)):
    row = db.execute("SELECT * FROM materialien WHERE id=?", (id,)).fetchone()
    if not row: raise HTTPException(404, "Material nicht gefunden")
    m = dict(row)
    if m.get("user_id") != user["id"]:
        raise HTTPException(403, "Keine Berechtigung")
    return m

@app.post("/materialien", status_code=201)
def create_material(data: MaterialCreate, db: sqlite3.Connection = Depends(get_db),
                    user=Depends(get_current_user)):
    cur = db.execute(
        "INSERT INTO materialien (titel,jahrgangsstufe,typ,pruefungsart,firma_name,firma_icon,gesamt_punkte,daten_json,user_id) VALUES (?,?,?,?,?,?,?,?,?)",
        (data.titel, data.jahrgangsstufe, data.typ, data.pruefungsart,
         data.firma_name, data.firma_icon, data.gesamt_punkte, data.daten_json, user["id"])
    )
    db.commit(); return {"id": cur.lastrowid, "erstellt": datetime.now().isoformat()}

@app.put("/materialien/{id}")
def update_material(id: int, data: MaterialCreate, db: sqlite3.Connection = Depends(get_db),
                    user=Depends(get_current_user)):
    row = db.execute("SELECT user_id FROM materialien WHERE id=?", (id,)).fetchone()
    if not row: raise HTTPException(404, "Material nicht gefunden")
    if row["user_id"] != user["id"]:
        raise HTTPException(403, "Keine Berechtigung")
    db.execute(
        "UPDATE materialien SET titel=?,jahrgangsstufe=?,typ=?,pruefungsart=?,firma_name=?,firma_icon=?,gesamt_punkte=?,daten_json=?,geaendert=datetime('now') WHERE id=?",
        (data.titel, data.jahrgangsstufe, data.typ, data.pruefungsart,
         data.firma_name, data.firma_icon, data.gesamt_punkte, data.daten_json, id)
    )
    db.commit(); return {"ok": True}

@app.delete("/materialien/{id}", status_code=204)
def delete_material(id: int, db: sqlite3.Connection = Depends(get_db),
                    user=Depends(get_current_user)):
    row = db.execute("SELECT user_id FROM materialien WHERE id=?", (id,)).fetchone()
    if not row: raise HTTPException(404, "Material nicht gefunden")
    if row["user_id"] != user["id"]:
        raise HTTPException(403, "Keine Berechtigung")
    db.execute("DELETE FROM materialien WHERE id=?", (id,)); db.commit()

class SpielErgebnis(BaseModel):
    session_code: str
    spieler: str
    punkte: int = 0
    max_punkte: int = 0
    zeit: int = 0
    klasse: Optional[str] = None

@app.post("/spielrangliste", status_code=201)
def create_spielergebnis(data: SpielErgebnis, db: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
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
    if not _re.match(r'^[a-zA-ZäöüÄÖÜß0-9 \-]{1,40}$', data.spieler):
        raise HTTPException(400, "Ungültiger Spielername")
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
def create_support(data: SupportLog, db: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    db.execute("INSERT INTO support_logs (typ,text,ts) VALUES (?,?,?)",
               (data.typ, data.text, data.ts or datetime.now().isoformat()))
    db.commit()
    # E-Mail-Benachrichtigung an Admin
    if ADMIN_EMAIL and RESEND_KEY:
        typ_labels = {"bug": "🐛 Fehler", "idee": "💡 Idee", "lob": "⭐ Lob"}
        typ_label = typ_labels.get(data.typ or "", data.typ or "Feedback")
        send_email(
            ADMIN_EMAIL,
            f"[BuchungsWerk] Neues Feedback: {typ_label}",
            f"<h2>Neues Feedback eingegangen</h2>"
            f"<p><strong>Typ:</strong> {typ_label}</p>"
            f"<p><strong>Zeitpunkt:</strong> {data.ts or datetime.now().isoformat()}</p>"
            f"<hr/>"
            f"<p>{html.escape(data.text or '').replace(chr(10), '<br/>')}</p>",
        )
    return {"ok": True}

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
    # Cleanup: leere Buckets entfernen (Memory Leak Fix)
    keys_to_delete = [k for k, v in _rate_buckets.items() if len(v) == 0]
    for k in keys_to_delete:
        del _rate_buckets[k]

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


@app.delete("/quiz/live/{code}", status_code=204)
def live_quiz_loeschen(code: str, user=Depends(get_current_user),
                       db: sqlite3.Connection = Depends(get_db)):
    code = code.upper()
    quiz = db.execute("SELECT lehrer_id FROM live_quizze WHERE code=?", (code,)).fetchone()
    if not quiz:
        raise HTTPException(404, "Quiz nicht gefunden")
    if quiz["lehrer_id"] != user["id"]:
        raise HTTPException(403, "Keine Berechtigung")
    db.execute("DELETE FROM live_quiz_antworten WHERE quiz_code=?", (code,))
    db.execute("DELETE FROM live_quiz_teilnehmer WHERE quiz_code=?", (code,))
    db.execute("DELETE FROM live_quizze WHERE code=?", (code,))
    db.commit()


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
def streak_record(data: StreakRecord, db: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
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
def level_record(data: LevelRecord, db: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
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


# ══════════════════════════════════════════════════════════════════════════════
# PAYMENT (PayPal)
# ══════════════════════════════════════════════════════════════════════════════

class PaymentCreateReq(BaseModel):
    product_type: str = "pro_monthly"

class PaymentVerifyReq(BaseModel):
    order_id: str

def _paypal_auth_header() -> str:
    import base64
    return "Basic " + base64.b64encode(f"{PAYPAL_CLIENT_ID}:{PAYPAL_SECRET}".encode()).decode()

@app.post("/payment/create-order")
async def payment_create_order(
    data: PaymentCreateReq,
    user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Erstellt eine PayPal-Order und gibt die approval_url zurück."""
    if not PAYPAL_CLIENT_ID or not PAYPAL_SECRET:
        raise HTTPException(503, "PayPal nicht konfiguriert – PAYPAL_CLIENT_ID/SECRET fehlen")
    import time as _time
    order_data = {
        "intent": "CAPTURE",
        "purchase_units": [{
            "reference_id": f"bw_{user['id']}_{int(_time.time())}",
            "amount": {"currency_code": "EUR", "value": "4.99"},
            "description": "BuchungsWerk Pro-Lizenz (1 Monat)",
        }],
        "application_context": {
            "return_url":          f"{APP_URL}/payment/return",
            "cancel_url":           f"{APP_URL}/buchungswerk",
            "brand_name":           "BuchungsWerk",
            "user_action":          "PAY_NOW",
            "shipping_preference":  "NO_SHIPPING",   # Digitales Produkt – keine Lieferadresse
            "landing_page":         "LOGIN",
        },
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(
            f"{PAYPAL_BASE_URL}/v2/checkout/orders",
            headers={"Content-Type": "application/json", "Authorization": _paypal_auth_header()},
            json=order_data,
        )
    if r.status_code not in (200, 201):
        raise HTTPException(502, f"PayPal-Fehler {r.status_code}: {r.text[:200]}")
    order = r.json()
    approval_url = next(
        (link["href"] for link in order.get("links", []) if link["rel"] == "approve"),
        None,
    )
    if not approval_url:
        raise HTTPException(502, "Keine approval_url von PayPal erhalten")
    db.execute(
        "INSERT OR IGNORE INTO payment_orders (order_id, user_id, status) VALUES (?,?,?)",
        (order["id"], user["id"], "CREATED"),
    )
    db.commit()
    return {"success": True, "approval_url": approval_url}


@app.post("/payment/verify-order")
async def payment_verify_order(
    data: PaymentVerifyReq,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Captured eine PayPal-Order und aktualisiert die Lizenz des Users."""
    if not PAYPAL_CLIENT_ID or not PAYPAL_SECRET:
        raise HTTPException(503, "PayPal nicht konfiguriert")
    # Sicherstellen dass die Order zu diesem User gehört
    row = db.execute(
        "SELECT user_id, status FROM payment_orders WHERE order_id=?",
        (data.order_id,),
    ).fetchone()
    if row and row["user_id"] != user["id"]:
        raise HTTPException(403, "Order gehört nicht zu diesem Account")
    if row and row["status"] == "CAPTURED":
        return {"success": True, "message": "Lizenz bereits aktiv"}
    # PayPal: Order capturen
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(
            f"{PAYPAL_BASE_URL}/v2/checkout/orders/{data.order_id}/capture",
            headers={"Content-Type": "application/json", "Authorization": _paypal_auth_header()},
            json={},
        )
    if r.status_code not in (200, 201):
        raise HTTPException(502, f"PayPal Capture-Fehler {r.status_code}: {r.text[:200]}")
    order = r.json()
    if order.get("status") != "COMPLETED":
        return {"success": False, "message": f"Zahlung nicht abgeschlossen (Status: {order.get('status')})"}
    # Lizenz updaten
    lizenz_bis = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")
    db.execute(
        "UPDATE users SET lizenz_typ='pro', lizenz_bis=? WHERE id=?",
        (lizenz_bis, user["id"]),
    )
    db.execute(
        "UPDATE payment_orders SET status='CAPTURED', captured_at=datetime('now') WHERE order_id=?",
        (data.order_id,),
    )
    db.commit()
    # Bestätigungs-Email
    background_tasks.add_task(
        send_email,
        user["email"],
        "Glückwunsch! Deine BuchungsWerk Pro-Lizenz ist aktiv",
        f"""<div style="font-family:Arial,sans-serif;color:#333;max-width:480px">
        <h1 style="color:#e8600a">Zahlung erfolgreich!</h1>
        <p>Hallo {user.get('vorname','')},</p>
        <p>deine Pro-Lizenz ist jetzt aktiv. Du hast Zugriff auf alle Klassen 7–10!</p>
        <p><strong>Gültig bis:</strong> {datetime.strptime(lizenz_bis,'%Y-%m-%d %H:%M:%S').strftime('%d.%m.%Y')}</p>
        <p><a href="{APP_URL}/buchungswerk"
              style="display:inline-block;padding:12px 24px;background:#e8600a;color:#fff;text-decoration:none;border-radius:8px">
           Jetzt starten
        </a></p>
        <p style="font-size:12px;color:#999">Fragen? Antworte auf diese E-Mail oder schreib an info@buchungswerk.org</p>
        </div>""",
    )
    return {"success": True, "message": "Lizenz wurde aktiviert", "lizenz_bis": lizenz_bis}


# ══════════════════════════════════════════════════════════════════════════════
# PAYMENT (PayPal Subscriptions – Billing Plans v1)
# ══════════════════════════════════════════════════════════════════════════════

class PayPalSubReq(BaseModel):
    plan_type: str = "monthly"   # "monthly" only for now

async def _paypal_token() -> str:
    """Holt einen OAuth2-Access-Token von PayPal."""
    import base64
    creds = base64.b64encode(f"{PAYPAL_CLIENT_ID}:{PAYPAL_SECRET}".encode()).decode()
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(
            f"{PAYPAL_BASE_URL}/v1/oauth2/token",
            headers={"Authorization": f"Basic {creds}", "Content-Type": "application/x-www-form-urlencoded"},
            content=b"grant_type=client_credentials",
        )
    if r.status_code != 200:
        raise HTTPException(502, f"PayPal Token-Fehler: {r.text[:200]}")
    return r.json()["access_token"]


@app.post("/payment/paypal/create-subscription")
async def paypal_create_subscription(
    data: PayPalSubReq,
    user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Erstellt ein PayPal-Abo und gibt die approval_url zurück."""
    if not PAYPAL_CLIENT_ID or not PAYPAL_SECRET:
        raise HTTPException(503, "PayPal nicht konfiguriert")
    if not PAYPAL_PLAN_ID_MONTHLY:
        raise HTTPException(503, "PayPal Plan-ID nicht konfiguriert – PAYPAL_PLAN_ID_MONTHLY fehlt")
    # Kein Doppelabo
    existing = db.execute(
        "SELECT id FROM payment_subscriptions WHERE user_id=? AND provider='paypal' AND status='active'",
        (user["id"],),
    ).fetchone()
    if existing:
        raise HTTPException(409, "Du hast bereits ein aktives PayPal-Abo")
    token = await _paypal_token()
    payload = {
        "plan_id": PAYPAL_PLAN_ID_MONTHLY,
        "subscriber": {"email_address": user["email"]},
        "application_context": {
            "brand_name":   "BuchungsWerk",
            "return_url":   f"{APP_URL}/payment/paypal/return",
            "cancel_url":   f"{APP_URL}/buchungswerk",
            "user_action":  "SUBSCRIBE_NOW",
            "shipping_preference": "NO_SHIPPING",
        },
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(
            f"{PAYPAL_BASE_URL}/v1/billing/subscriptions",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=payload,
        )
    if r.status_code not in (200, 201):
        raise HTTPException(502, f"PayPal Subscription-Fehler: {r.text[:200]}")
    sub = r.json()
    approval_url = next(
        (link["href"] for link in sub.get("links", []) if link["rel"] == "approve"),
        None,
    )
    if not approval_url:
        raise HTTPException(502, "Keine approval_url von PayPal erhalten")
    # Subscription vormerken (Status PENDING bis Webhook aktiviert)
    db.execute("""
        INSERT INTO payment_subscriptions
            (user_id, subscription_id, provider, status, amount_eur, interval, paypal_plan_id)
        VALUES (?,?,?,?,?,?,?)
        ON CONFLICT(subscription_id) DO NOTHING
    """, (user["id"], sub["id"], "paypal", "pending", 4.99, "month", PAYPAL_PLAN_ID_MONTHLY))
    db.commit()
    return {"approval_url": approval_url, "subscription_id": sub["id"]}


@app.post("/payment/paypal/webhook")
async def paypal_subscription_webhook(
    request: Request,
    db: sqlite3.Connection = Depends(get_db),
):
    """Verarbeitet PayPal Subscription Webhook-Events."""
    payload = await request.body()
    try:
        event = __import__("json").loads(payload)
    except Exception:
        raise HTTPException(400, "Ungültiger Webhook-Body")
    event_id   = event.get("id", "")
    event_type = event.get("event_type", "")
    resource   = event.get("resource", {})
    # Idempotenz
    if db.execute("SELECT id FROM webhook_logs WHERE id=?", (event_id,)).fetchone():
        return {"status": "already_processed"}
    result = "ignored"
    sub_id = resource.get("id") or resource.get("billing_agreement_id", "")
    if event_type in ("BILLING.SUBSCRIPTION.ACTIVATED", "BILLING.SUBSCRIPTION.UPDATED"):
        # next_billing_time aus PayPal
        next_billing = resource.get("billing_info", {}).get("next_billing_time") or resource.get("next_billing_time")
        if next_billing:
            next_billing = next_billing[:19].replace("T", " ")
        row = db.execute("SELECT user_id FROM payment_subscriptions WHERE subscription_id=?",
                         (sub_id,)).fetchone()
        if row:
            db.execute("""
                UPDATE payment_subscriptions
                SET status='active', current_period_end=?
                WHERE subscription_id=?
            """, (next_billing, sub_id))
            db.execute("UPDATE users SET lizenz_typ='pro', lizenz_bis=? WHERE id=?",
                       (next_billing, row["user_id"]))
            db.commit()
            result = "subscription_activated"
    elif event_type in ("BILLING.SUBSCRIPTION.CANCELLED", "BILLING.SUBSCRIPTION.SUSPENDED",
                        "BILLING.SUBSCRIPTION.EXPIRED"):
        row = db.execute("SELECT user_id FROM payment_subscriptions WHERE subscription_id=?",
                         (sub_id,)).fetchone()
        if row:
            new_status = "cancelled" if "CANCEL" in event_type or "EXPIR" in event_type else "paused"
            db.execute("""
                UPDATE payment_subscriptions
                SET status=?, cancelled_at=datetime('now')
                WHERE subscription_id=?
            """, (new_status, sub_id))
            if new_status == "cancelled":
                db.execute("UPDATE users SET lizenz_typ='free', lizenz_bis=NULL WHERE id=?",
                           (row["user_id"],))
            db.commit()
            result = f"subscription_{new_status}"
    elif event_type == "PAYMENT.SALE.COMPLETED":
        # Wiederkehrende Zahlung: Lizenz-Gültigkeit verlängern
        agreement_id = resource.get("billing_agreement_id", "")
        if agreement_id:
            row = db.execute("SELECT user_id, current_period_end FROM payment_subscriptions WHERE subscription_id=?",
                             (agreement_id,)).fetchone()
            if row:
                # 31 Tage ab jetzt als neue Laufzeit
                new_end = (datetime.now() + timedelta(days=31)).strftime("%Y-%m-%d %H:%M:%S")
                db.execute("UPDATE payment_subscriptions SET current_period_end=? WHERE subscription_id=?",
                           (new_end, agreement_id))
                db.execute("UPDATE users SET lizenz_bis=? WHERE id=?", (new_end, row["user_id"]))
                db.commit()
                result = "sale_completed"
    db.execute("INSERT INTO webhook_logs (id, provider, event_type, result) VALUES (?,?,?,?)",
               (event_id, "paypal_sub", event_type, result))
    db.commit()
    return {"status": "ok", "result": result}


@app.post("/payment/paypal/suspend")
async def paypal_suspend_subscription(
    user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Pausiert das aktive PayPal-Abo."""
    if not PAYPAL_CLIENT_ID or not PAYPAL_SECRET:
        raise HTTPException(503, "PayPal nicht konfiguriert")
    sub = _get_active_sub(db, user["id"])
    if not sub or sub["provider"] != "paypal":
        raise HTTPException(404, "Kein aktives PayPal-Abo gefunden")
    token = await _paypal_token()
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(
            f"{PAYPAL_BASE_URL}/v1/billing/subscriptions/{sub['subscription_id']}/suspend",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"reason": "Auf Wunsch des Nutzers pausiert"},
        )
    if r.status_code not in (200, 204):
        raise HTTPException(502, f"PayPal Suspend-Fehler: {r.text[:200]}")
    db.execute("UPDATE payment_subscriptions SET status='paused', paused_at=datetime('now') WHERE id=?",
               (sub["id"],))
    db.commit()
    return {"success": True, "message": "PayPal-Abo pausiert"}


@app.post("/payment/paypal/cancel")
async def paypal_cancel_subscription(
    user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """Kündigt das aktive PayPal-Abo."""
    if not PAYPAL_CLIENT_ID or not PAYPAL_SECRET:
        raise HTTPException(503, "PayPal nicht konfiguriert")
    sub = db.execute(
        "SELECT * FROM payment_subscriptions WHERE user_id=? AND provider='paypal' AND status IN ('active','paused') LIMIT 1",
        (user["id"],),
    ).fetchone()
    if not sub:
        raise HTTPException(404, "Kein aktives PayPal-Abo gefunden")
    sub = dict(sub)
    token = await _paypal_token()
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(
            f"{PAYPAL_BASE_URL}/v1/billing/subscriptions/{sub['subscription_id']}/cancel",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"reason": "Auf Wunsch des Nutzers gekündigt"},
        )
    if r.status_code not in (200, 204):
        raise HTTPException(502, f"PayPal Cancel-Fehler: {r.text[:200]}")
    db.execute("UPDATE payment_subscriptions SET status='cancelled', cancelled_at=datetime('now') WHERE id=?",
               (sub["id"],))
    db.execute("UPDATE users SET lizenz_typ='free', lizenz_bis=NULL WHERE id=?", (user["id"],))
    db.commit()
    background_tasks.add_task(
        send_email, user["email"],
        "Dein BuchungsWerk PayPal-Abo wurde gekündigt",
        f"""<div style="font-family:Arial,sans-serif;color:#333;max-width:480px">
        <h2>Abo gekündigt</h2>
        <p>Hallo {user.get('vorname','')},</p>
        <p>dein PayPal-Abo wurde erfolgreich gekündigt. Du kannst jederzeit ein neues Abo abschließen.</p>
        </div>""",
    )
    return {"success": True, "message": "PayPal-Abo gekündigt"}


# ══════════════════════════════════════════════════════════════════════════════
# PAYMENT (Stripe)
# ══════════════════════════════════════════════════════════════════════════════

class StripeCheckoutReq(BaseModel):
    plan: str = "monthly"   # "monthly" | "yearly"

class StripeSubActionReq(BaseModel):
    subscription_id: str

def _stripe():
    import stripe as _stripe
    _stripe.api_key = STRIPE_API_KEY
    return _stripe

def _get_active_sub(db: sqlite3.Connection, user_id: int) -> dict | None:
    row = db.execute(
        "SELECT * FROM payment_subscriptions WHERE user_id=? AND status='active' ORDER BY created_at DESC LIMIT 1",
        (user_id,),
    ).fetchone()
    return dict(row) if row else None

@app.post("/payment/stripe/create-checkout")
async def stripe_create_checkout(
    data: StripeCheckoutReq,
    user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Erstellt eine Stripe Checkout Session (monatlich oder jährlich)."""
    if not STRIPE_API_KEY:
        raise HTTPException(503, "Stripe nicht konfiguriert – STRIPE_API_KEY fehlt")
    price_id = STRIPE_PRICE_MONTHLY if data.plan == "monthly" else STRIPE_PRICE_YEARLY
    if not price_id:
        raise HTTPException(503, f"Stripe Price-ID für Plan '{data.plan}' nicht konfiguriert")
    stripe = _stripe()
    # Bestehenden Stripe-Customer wiederverwenden oder neu anlegen
    existing_sub = _get_active_sub(db, user["id"])
    customer_id  = existing_sub["stripe_customer_id"] if existing_sub else None
    if not customer_id:
        customers = stripe.Customer.list(email=user["email"], limit=1)
        customer_id = customers.data[0].id if customers.data else None
    if not customer_id:
        customer   = stripe.Customer.create(
            email=user["email"],
            name=f"{user.get('vorname','')} {user.get('nachname','')}".strip(),
            metadata={"bw_user_id": str(user["id"])},
        )
        customer_id = customer.id
    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card", "sepa_debit"],
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{APP_URL}/payment/stripe/return?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{APP_URL}/buchungswerk",
        metadata={"bw_user_id": str(user["id"]), "plan": data.plan},
        locale="de",
        allow_promotion_codes=True,
    )
    return {"checkout_url": session.url}


@app.post("/payment/stripe/webhook")
async def stripe_webhook(request: Request, db: sqlite3.Connection = Depends(get_db)):
    """Verarbeitet Stripe-Webhook-Events (Abo-Aktivierung, -Änderung, -Kündigung)."""
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(503, "Stripe Webhook nicht konfiguriert")
    payload = await request.body()
    sig     = request.headers.get("stripe-signature", "")
    stripe  = _stripe()
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        raise HTTPException(400, f"Ungültige Webhook-Signatur: {e}")
    # Idempotenz: schon verarbeitet?
    if db.execute("SELECT id FROM webhook_logs WHERE id=?", (event["id"],)).fetchone():
        return {"status": "already_processed"}
    etype = event["type"]
    obj   = event["data"]["object"]
    result = "ignored"

    if etype in ("customer.subscription.created", "customer.subscription.updated"):
        sub_id     = obj["id"]
        customer_id = obj["customer"]
        status_raw = obj["status"]   # active, past_due, paused, cancelled, ...
        period_end = datetime.fromtimestamp(obj["current_period_end"]).strftime("%Y-%m-%d %H:%M:%S")
        interval   = obj["items"]["data"][0]["plan"]["interval"]   # "month" | "year"
        amount_eur = obj["items"]["data"][0]["plan"]["amount"] / 100
        bw_user_id = int(obj.get("metadata", {}).get("bw_user_id") or
                         db.execute("SELECT user_id FROM payment_subscriptions WHERE subscription_id=?",
                                    (sub_id,)).fetchone()["user_id"] if
                         db.execute("SELECT user_id FROM payment_subscriptions WHERE subscription_id=?",
                                    (sub_id,)).fetchone() else 0)
        if not bw_user_id:
            result = "user_not_found"
        else:
            bw_status = "active" if status_raw == "active" else ("paused" if status_raw == "paused" else "cancelled")
            db.execute("""
                INSERT INTO payment_subscriptions
                    (user_id, subscription_id, provider, status, amount_eur, interval,
                     stripe_customer_id, current_period_end)
                VALUES (?,?,?,?,?,?,?,?)
                ON CONFLICT(subscription_id) DO UPDATE SET
                    status=excluded.status, amount_eur=excluded.amount_eur,
                    current_period_end=excluded.current_period_end,
                    stripe_customer_id=excluded.stripe_customer_id
            """, (bw_user_id, sub_id, "stripe", bw_status, amount_eur,
                  interval, customer_id, period_end))
            if bw_status == "active":
                lizenz_bis = period_end
                db.execute("UPDATE users SET lizenz_typ='pro', lizenz_bis=? WHERE id=?",
                           (lizenz_bis, bw_user_id))
            result = f"subscription_{bw_status}"

    elif etype in ("customer.subscription.deleted",):
        sub_id = obj["id"]
        row    = db.execute("SELECT user_id FROM payment_subscriptions WHERE subscription_id=?",
                            (sub_id,)).fetchone()
        if row:
            db.execute("UPDATE payment_subscriptions SET status='cancelled', cancelled_at=datetime('now') WHERE subscription_id=?",
                       (sub_id,))
            db.execute("UPDATE users SET lizenz_typ='free', lizenz_bis=NULL WHERE id=?",
                       (row["user_id"],))
            result = "subscription_cancelled"

    elif etype == "checkout.session.completed":
        # Backup: falls subscription-Event fehlt
        cs_sub = obj.get("subscription")
        bw_uid = int(obj.get("metadata", {}).get("bw_user_id", 0))
        if cs_sub and bw_uid:
            sub = stripe.Subscription.retrieve(cs_sub)
            period_end = datetime.fromtimestamp(sub["current_period_end"]).strftime("%Y-%m-%d %H:%M:%S")
            interval   = sub["items"]["data"][0]["plan"]["interval"]
            amount_eur = sub["items"]["data"][0]["plan"]["amount"] / 100
            db.execute("""
                INSERT INTO payment_subscriptions
                    (user_id, subscription_id, provider, status, amount_eur, interval,
                     stripe_customer_id, current_period_end)
                VALUES (?,?,?,?,?,?,?,?)
                ON CONFLICT(subscription_id) DO UPDATE SET
                    status='active', current_period_end=excluded.current_period_end
            """, (bw_uid, cs_sub, "stripe", "active", amount_eur,
                  interval, obj.get("customer"), period_end))
            db.execute("UPDATE users SET lizenz_typ='pro', lizenz_bis=? WHERE id=?",
                       (period_end, bw_uid))
            result = "checkout_activated"

    db.execute("INSERT INTO webhook_logs (id, provider, event_type, result) VALUES (?,?,?,?)",
               (event["id"], "stripe", etype, result))
    db.commit()
    return {"status": "ok", "result": result}


@app.post("/payment/stripe/customer-portal")
async def stripe_customer_portal(
    user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Gibt die Stripe Customer Portal URL zurück (Abo verwalten, kündigen)."""
    if not STRIPE_API_KEY:
        raise HTTPException(503, "Stripe nicht konfiguriert")
    sub = _get_active_sub(db, user["id"])
    if not sub or not sub.get("stripe_customer_id"):
        raise HTTPException(404, "Kein aktives Stripe-Abo gefunden")
    stripe  = _stripe()
    session = stripe.billing_portal.Session.create(
        customer=sub["stripe_customer_id"],
        return_url=f"{APP_URL}/buchungswerk",
    )
    return {"portal_url": session.url}


@app.post("/payment/stripe/pause")
async def stripe_pause_subscription(
    user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Pausiert das aktive Stripe-Abo (Zahlungen aussetzen, Zugang bleibt bis Periodenende)."""
    if not STRIPE_API_KEY:
        raise HTTPException(503, "Stripe nicht konfiguriert")
    sub = _get_active_sub(db, user["id"])
    if not sub:
        raise HTTPException(404, "Kein aktives Abo gefunden")
    stripe = _stripe()
    stripe.Subscription.modify(
        sub["subscription_id"],
        pause_collection={"behavior": "keep_as_draft"},
    )
    db.execute("UPDATE payment_subscriptions SET status='paused', paused_at=datetime('now') WHERE id=?",
               (sub["id"],))
    db.commit()
    return {"success": True, "message": "Abo pausiert – Zugang bis Periodenende aktiv"}


@app.post("/payment/stripe/cancel")
async def stripe_cancel_subscription(
    user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """Kündigt das aktive Stripe-Abo zum Periodenende."""
    if not STRIPE_API_KEY:
        raise HTTPException(503, "Stripe nicht konfiguriert")
    sub = _get_active_sub(db, user["id"])
    if not sub:
        raise HTTPException(404, "Kein aktives Abo gefunden")
    stripe = _stripe()
    stripe.Subscription.modify(sub["subscription_id"], cancel_at_period_end=True)
    db.execute("UPDATE payment_subscriptions SET status='cancelled', cancelled_at=datetime('now') WHERE id=?",
               (sub["id"],))
    db.commit()
    background_tasks.add_task(
        send_email, user["email"],
        "Dein BuchungsWerk Pro-Abo wurde gekündigt",
        f"""<div style="font-family:Arial,sans-serif;color:#333;max-width:480px">
        <h2>Abo gekündigt</h2>
        <p>Hallo {user.get('vorname','')},</p>
        <p>dein Pro-Abo wurde zum Ende der aktuellen Abrechnungsperiode gekündigt.</p>
        <p>Du hast bis <strong>{sub['current_period_end'][:10]}</strong> weiterhin vollen Zugriff.</p>
        <p>Du kannst jederzeit ein neues Abo abschließen.</p>
        </div>""",
    )
    return {"success": True, "message": "Abo wird zum Periodenende beendet"}


@app.get("/payment/subscription/status")
async def subscription_status(
    user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Gibt den aktuellen Abo-Status zurück."""
    sub = db.execute(
        "SELECT * FROM payment_subscriptions WHERE user_id=? ORDER BY created_at DESC LIMIT 1",
        (user["id"],),
    ).fetchone()
    if not sub:
        return {"has_subscription": False}
    sub = dict(sub)
    return {
        "has_subscription": True,
        "subscription_id":  sub["subscription_id"],
        "provider":         sub["provider"],
        "status":           sub["status"],
        "plan_type":        sub["plan_type"],
        "interval":         sub["interval"],
        "amount_eur":       sub["amount_eur"],
        "current_period_end": sub.get("current_period_end"),
        "paused_at":        sub.get("paused_at"),
        "cancelled_at":     sub.get("cancelled_at"),
    }


# ══════════════════════════════════════════════════════════════════════════════
# PAYMENT (Rechnung / Überweisung – Invoice System)
# ══════════════════════════════════════════════════════════════════════════════

import re as _re_inv

def _next_invoice_number(db: sqlite3.Connection) -> str:
    """Generiert die nächste sequentielle Rechnungsnummer: BW-YYYY-MM-NNNN."""
    now = datetime.now(timezone.utc)
    prefix = f"BW-{now.year}-{now.month:02d}-"
    row = db.execute(
        "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1",
        (prefix + "%",),
    ).fetchone()
    if row:
        last_n = int(row["invoice_number"].rsplit("-", 1)[-1])
        n = last_n + 1
    else:
        n = 1
    return f"{prefix}{n:04d}"


class InvoiceCreateReq(BaseModel):
    plan_type: str = "pro_monthly"


@app.post("/payment/invoice/create")
async def invoice_create(
    data: InvoiceCreateReq,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Erstellt eine Rechnung für Banküberweisung und sendet sie per E-Mail."""
    if not BW_BUSINESS_IBAN:
        raise HTTPException(503, "Bankdaten noch nicht konfiguriert – bitte Stripe oder PayPal verwenden")
    # Kein doppeltes Ausstehen
    existing = db.execute(
        "SELECT invoice_number FROM invoices WHERE user_id=? AND status='pending'",
        (user["id"],),
    ).fetchone()
    if existing:
        raise HTTPException(409, f"Du hast bereits eine offene Rechnung: {existing['invoice_number']}")

    invoice_number = _next_invoice_number(db)
    due_date = (datetime.now(timezone.utc) + timedelta(days=14)).strftime("%Y-%m-%d")

    db.execute("""
        INSERT INTO invoices
            (invoice_number, user_id, amount_eur, plan_type, status, due_date, payment_reference)
        VALUES (?,?,?,?,?,?,?)
    """, (invoice_number, user["id"], 4.99, data.plan_type, "pending", due_date, invoice_number))
    db.commit()

    # HTML-E-Mail mit Bankdaten
    name = f"{user.get('vorname', '')} {user.get('nachname', '')}".strip() or user["email"]
    amount_str = "4,99 €"
    business_name    = BW_BUSINESS_NAME    or "BuchungsWerk"
    business_address = BW_BUSINESS_ADDRESS or "Adresse folgt nach Gewerbeanmeldung"
    steuernummer     = BW_STEUERNUMMER     or "Steuernummer folgt nach Gewerbeanmeldung"

    html_body = f"""
<div style="font-family:Arial,sans-serif;color:#333;max-width:560px;margin:0 auto">
  <h2 style="color:#e8600a;margin-bottom:4px">RECHNUNG</h2>
  <p style="color:#888;margin-top:0;font-size:14px">Nr. {invoice_number}</p>

  <table style="width:100%;margin-bottom:24px;font-size:14px">
    <tr><td style="color:#888">Rechnungsdatum:</td><td>{datetime.now(timezone.utc).strftime('%d.%m.%Y')}</td></tr>
    <tr><td style="color:#888">Leistungsdatum:</td><td>{datetime.now(timezone.utc).strftime('%d.%m.%Y')}</td></tr>
    <tr><td style="color:#888">Fällig bis:</td><td><strong>{due_date[8:]}.{due_date[5:7]}.{due_date[:4]}</strong></td></tr>
  </table>

  <table style="width:100%;margin-bottom:24px;font-size:14px">
    <tr>
      <td style="vertical-align:top;width:50%">
        <strong>Rechnungssteller:</strong><br>
        {html.escape(business_name)}<br>
        {html.escape(business_address)}<br>
        Steuernummer: {html.escape(steuernummer)}
      </td>
      <td style="vertical-align:top;width:50%">
        <strong>Rechnungsempfänger:</strong><br>
        {html.escape(name)}<br>
        {html.escape(user['email'])}
      </td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <thead>
      <tr style="background:#f5f5f5">
        <th style="text-align:left;padding:8px;border:1px solid #ddd">Leistungsbeschreibung</th>
        <th style="text-align:right;padding:8px;border:1px solid #ddd">Betrag</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd">BuchungsWerk Pro – 1 Monat Zugang (Klassen 8–10)</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">{amount_str}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr style="background:#f5f5f5">
        <td style="padding:8px;border:1px solid #ddd;text-align:right"><strong>Gesamtbetrag:</strong></td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right"><strong>{amount_str}</strong></td>
      </tr>
      <tr>
        <td colspan="2" style="padding:6px 8px;font-size:12px;color:#888;border:1px solid #ddd">
          Gemäß §19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).
        </td>
      </tr>
    </tfoot>
  </table>

  <div style="background:#f0f7ff;border:1px solid #b3d4f5;border-radius:8px;padding:16px;margin-bottom:24px">
    <h3 style="margin-top:0;color:#1a5c8a">Bankverbindung</h3>
    <table style="font-size:14px;width:100%">
      <tr><td style="color:#888;width:140px">Kontoinhaber:</td><td><strong>{html.escape(business_name)}</strong></td></tr>
      <tr><td style="color:#888">IBAN:</td><td><strong>{html.escape(BW_BUSINESS_IBAN)}</strong></td></tr>
      <tr><td style="color:#888">BIC:</td><td><strong>{html.escape(BW_BUSINESS_BIC or 'auf Anfrage')}</strong></td></tr>
      <tr><td style="color:#888">Verwendungszweck:</td><td><strong style="color:#e8600a">{invoice_number}</strong></td></tr>
      <tr><td style="color:#888">Betrag:</td><td><strong>{amount_str}</strong></td></tr>
    </table>
    <p style="margin-bottom:0;font-size:13px;color:#555">
      ⚠️ Bitte gib als Verwendungszweck exakt <strong>{invoice_number}</strong> an,
      damit wir deine Zahlung zuordnen können.
    </p>
  </div>

  <p style="font-size:13px;color:#888">
    Nach Eingang der Zahlung wird deine Pro-Lizenz manuell aktiviert. Das dauert
    in der Regel 1–2 Werktage. Du erhältst dann eine Bestätigungs-E-Mail.
  </p>
  <p style="font-size:13px;color:#888">
    Bei Fragen: <a href="mailto:info@buchungswerk.org">info@buchungswerk.org</a>
  </p>
</div>"""

    background_tasks.add_task(
        send_email,
        user["email"],
        f"Deine BuchungsWerk-Rechnung {invoice_number}",
        html_body,
    )
    # Admin informieren
    if ADMIN_EMAIL:
        background_tasks.add_task(
            send_email,
            ADMIN_EMAIL,
            f"[BuchungsWerk] Neue Rechnung: {invoice_number} – {user['email']}",
            f"<p>Neue Rechnung erstellt: <strong>{invoice_number}</strong><br>"
            f"User: {html.escape(user['email'])}<br>"
            f"Fällig: {due_date}<br>"
            f"<a href='{APP_URL}/admin'>Zum Admin-Panel</a></p>",
        )
    return {"invoice_number": invoice_number, "due_date": due_date, "amount_eur": 4.99}


@app.get("/payment/invoice/status")
async def invoice_status(
    user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Gibt die aktuellste ausstehende Rechnung des Users zurück."""
    row = db.execute(
        "SELECT * FROM invoices WHERE user_id=? ORDER BY created_at DESC LIMIT 1",
        (user["id"],),
    ).fetchone()
    if not row:
        return {"has_invoice": False}
    row = dict(row)
    return {"has_invoice": True, **row}


@app.get("/admin/invoices")
async def admin_list_invoices(
    status: str | None = None,
    limit: int = 50,
    user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Admin: Alle Rechnungen auflisten."""
    if not user.get("is_admin"):
        raise HTTPException(403, "Nur für Admins")
    if status:
        rows = db.execute(
            """SELECT i.*, u.email, u.vorname, u.nachname
               FROM invoices i JOIN users u ON u.id = i.user_id
               WHERE i.status=? ORDER BY i.created_at DESC LIMIT ?""",
            (status, limit),
        ).fetchall()
    else:
        rows = db.execute(
            """SELECT i.*, u.email, u.vorname, u.nachname
               FROM invoices i JOIN users u ON u.id = i.user_id
               ORDER BY i.created_at DESC LIMIT ?""",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


class InvoiceConfirmReq(BaseModel):
    invoice_number: str
    lizenz_tage: int = 30   # wie viele Tage Pro-Zugang gewähren


@app.post("/admin/invoice/confirm-paid")
async def admin_confirm_invoice_paid(
    data: InvoiceConfirmReq,
    background_tasks: BackgroundTasks,
    admin: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Admin: Banküberweisung manuell als eingegangen bestätigen."""
    if not admin.get("is_admin"):
        raise HTTPException(403, "Nur für Admins")
    inv = db.execute(
        "SELECT * FROM invoices WHERE invoice_number=?",
        (data.invoice_number,),
    ).fetchone()
    if not inv:
        raise HTTPException(404, "Rechnung nicht gefunden")
    if inv["status"] == "paid":
        raise HTTPException(409, "Rechnung bereits als bezahlt markiert")

    lizenz_bis = (datetime.now(timezone.utc) + timedelta(days=data.lizenz_tage)).strftime("%Y-%m-%d %H:%M:%S")
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    db.execute(
        "UPDATE invoices SET status='paid', paid_at=?, confirmed_by=? WHERE invoice_number=?",
        (now_str, admin["id"], data.invoice_number),
    )
    db.execute(
        "UPDATE users SET lizenz_typ='pro', lizenz_bis=? WHERE id=?",
        (lizenz_bis, inv["user_id"]),
    )
    # In payment_subscriptions eintragen (für Tracking)
    db.execute("""
        INSERT INTO payment_subscriptions
            (user_id, subscription_id, provider, status, amount_eur, interval, current_period_end)
        VALUES (?,?,?,?,?,?,?)
        ON CONFLICT(subscription_id) DO UPDATE SET status='active', current_period_end=excluded.current_period_end
    """, (inv["user_id"], f"invoice-{data.invoice_number}", "manual", "active",
          inv["amount_eur"], "month", lizenz_bis))
    db.commit()

    # Bestätigungs-E-Mail an User
    user_row = db.execute("SELECT email, vorname FROM users WHERE id=?", (inv["user_id"],)).fetchone()
    if user_row:
        background_tasks.add_task(
            send_email,
            user_row["email"],
            "Zahlung erhalten – deine Pro-Lizenz ist aktiv!",
            f"""<div style="font-family:Arial,sans-serif;color:#333;max-width:480px">
            <h2 style="color:#e8600a">Zahlung erhalten!</h2>
            <p>Hallo {html.escape(user_row['vorname'] or '')},</p>
            <p>wir haben deine Überweisung für Rechnung <strong>{data.invoice_number}</strong> erhalten.</p>
            <p>Deine <strong>Pro-Lizenz ist jetzt aktiv</strong> bis zum {lizenz_bis[:10]}.</p>
            <p><a href="{APP_URL}/buchungswerk"
                  style="display:inline-block;padding:12px 24px;background:#e8600a;color:#fff;text-decoration:none;border-radius:8px">
               Zum Dashboard
            </a></p>
            <p style="color:#888;font-size:13px">Vielen Dank für dein Vertrauen in BuchungsWerk!</p>
            </div>""",
        )
    return {"success": True, "lizenz_bis": lizenz_bis}


@app.post("/admin/invoice/resend-email")
async def admin_resend_invoice_email(
    data: InvoiceConfirmReq,
    background_tasks: BackgroundTasks,
    admin: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Admin: Rechnungs-E-Mail erneut senden."""
    if not admin.get("is_admin"):
        raise HTTPException(403, "Nur für Admins")
    inv = db.execute(
        "SELECT i.*, u.email, u.vorname, u.nachname FROM invoices i JOIN users u ON u.id=i.user_id WHERE i.invoice_number=?",
        (data.invoice_number,),
    ).fetchone()
    if not inv:
        raise HTTPException(404, "Rechnung nicht gefunden")
    inv = dict(inv)
    name = f"{inv.get('vorname','') or ''} {inv.get('nachname','') or ''}".strip() or inv["email"]
    due_fmt = inv["due_date"]
    background_tasks.add_task(
        send_email,
        inv["email"],
        f"Erinnerung: Deine BuchungsWerk-Rechnung {data.invoice_number}",
        f"""<div style="font-family:Arial,sans-serif;color:#333;max-width:480px">
        <h2 style="color:#e8600a">Zahlungserinnerung</h2>
        <p>Hallo {html.escape(inv.get('vorname') or '')},</p>
        <p>deine Rechnung <strong>{data.invoice_number}</strong> über <strong>4,99 €</strong>
           ist noch ausstehend. Bitte überweise bis zum <strong>{due_fmt}</strong>.</p>
        <div style="background:#f0f7ff;border:1px solid #b3d4f5;border-radius:8px;padding:16px">
          <p style="margin:0"><strong>IBAN:</strong> {html.escape(BW_BUSINESS_IBAN or 'auf Anfrage')}</p>
          <p style="margin:4px 0"><strong>BIC:</strong> {html.escape(BW_BUSINESS_BIC or 'auf Anfrage')}</p>
          <p style="margin:4px 0"><strong>Verwendungszweck:</strong> <span style="color:#e8600a">{data.invoice_number}</span></p>
          <p style="margin:4px 0 0"><strong>Betrag:</strong> 4,99 €</p>
        </div>
        <p style="color:#888;font-size:13px">Bei Fragen: <a href="mailto:info@buchungswerk.org">info@buchungswerk.org</a></p>
        </div>""",
    )
    return {"success": True}


# ══════════════════════════════════════════════════════════════════════════════
# TEACHER DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/teacher/dashboard")
def teacher_dashboard(
    user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Lehrer-Dashboard: Lizenz-Info + Schüler-Anzahl + Quiz-Statistik."""
    schueler_count = db.execute(
        """SELECT COUNT(*) as cnt FROM schueler s
           JOIN klassen k ON s.klasse_id = k.id
           WHERE k.user_id = ?""",
        (user["id"],),
    ).fetchone()["cnt"]
    klassen_count = db.execute(
        "SELECT COUNT(*) as cnt FROM klassen WHERE user_id=?",
        (user["id"],),
    ).fetchone()["cnt"]
    quiz_count = db.execute(
        "SELECT COUNT(*) as cnt FROM live_quizze WHERE lehrer_id=?",
        (user["id"],),
    ).fetchone()["cnt"]
    return {
        "lizenz_info": {
            "typ": user.get("lizenz_typ") or "free",
            "bis": user.get("lizenz_bis"),
        },
        "schueler_count": schueler_count,
        "klassen_count":  klassen_count,
        "quiz_count":     quiz_count,
    }


# ══════════════════════════════════════════════════════════════════════════════
# STARTUP: Wöchentliche Abo-Erinnerungen (asyncio Background Loop)
# ══════════════════════════════════════════════════════════════════════════════

import asyncio

async def _weekly_reminder_loop():
    """Sendet wöchentlich eine Erinnerung an User deren Abo in 7 Tagen endet."""
    await asyncio.sleep(60)  # 1 Minute nach Start warten
    while True:
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            # Abos die in genau 6-8 Tagen enden (7-Tage-Fenster)
            rows = conn.execute("""
                SELECT u.email, u.vorname, ps.current_period_end, ps.interval
                FROM payment_subscriptions ps
                JOIN users u ON u.id = ps.user_id
                WHERE ps.status = 'active'
                  AND ps.current_period_end BETWEEN datetime('now', '+6 days')
                                                AND datetime('now', '+8 days')
            """).fetchall()
            for row in rows:
                period_end_fmt = row["current_period_end"][:10] if row["current_period_end"] else "bald"
                interval_text  = "Monat" if row["interval"] == "month" else "Jahr"
                send_email(
                    row["email"],
                    "Dein BuchungsWerk Pro-Abo verlängert sich in 7 Tagen",
                    f"""<div style="font-family:Arial,sans-serif;color:#333;max-width:480px">
                    <h2 style="color:#e8600a">Abo-Erinnerung</h2>
                    <p>Hallo {row['vorname'] or ''},</p>
                    <p>dein Pro-Abo verlängert sich automatisch am <strong>{period_end_fmt}</strong> für einen weiteren {interval_text}.</p>
                    <p>Möchtest du es nicht verlängern, kannst du es jederzeit im Dashboard kündigen.</p>
                    <p><a href="{APP_URL}/buchungswerk"
                          style="display:inline-block;padding:12px 24px;background:#e8600a;color:#fff;text-decoration:none;border-radius:8px">
                       Zum Dashboard
                    </a></p>
                    </div>""",
                )
            conn.close()
        except Exception as e:
            print(f"[reminder_loop] Fehler: {e}")
        await asyncio.sleep(7 * 24 * 3600)  # 7 Tage warten


async def _daily_invoice_expiry_loop():
    """Tägliche Prüfung auf abgelaufene Rechnungen (nach 14 Tagen)."""
    await asyncio.sleep(120)  # 2 Minuten nach Start warten
    while True:
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            expired = conn.execute("""
                SELECT i.*, u.email, u.vorname
                FROM invoices i JOIN users u ON u.id = i.user_id
                WHERE i.status = 'pending'
                  AND i.due_date < date('now')
            """).fetchall()
            for inv in expired:
                conn.execute(
                    "UPDATE invoices SET status='expired' WHERE invoice_number=?",
                    (inv["invoice_number"],),
                )
                # Lizenz zurücksetzen falls User noch kein anderes aktives Abo hat
                other_sub = conn.execute(
                    "SELECT id FROM payment_subscriptions WHERE user_id=? AND status='active'",
                    (inv["user_id"],),
                ).fetchone()
                if not other_sub:
                    conn.execute(
                        "UPDATE users SET lizenz_typ='free', lizenz_bis=NULL WHERE id=? AND lizenz_typ='pro'",
                        (inv["user_id"],),
                    )
                send_email(
                    inv["email"],
                    "Deine BuchungsWerk-Rechnung ist abgelaufen",
                    f"""<div style="font-family:Arial,sans-serif;color:#333;max-width:480px">
                    <h2 style="color:#cc3333">Rechnung abgelaufen</h2>
                    <p>Hallo {html.escape(inv['vorname'] or '')},</p>
                    <p>deine Rechnung <strong>{inv['invoice_number']}</strong> ist leider abgelaufen,
                       da wir innerhalb von 14 Tagen keine Zahlung erhalten haben.</p>
                    <p>Wenn du BuchungsWerk Pro weiterhin nutzen möchtest, kannst du jederzeit
                       eine neue Rechnung anfordern oder direkt per Stripe oder PayPal bezahlen.</p>
                    <p><a href="{APP_URL}/buchungswerk"
                          style="display:inline-block;padding:12px 24px;background:#e8600a;color:#fff;text-decoration:none;border-radius:8px">
                       Zum Dashboard
                    </a></p>
                    </div>""",
                )
            conn.commit()
            if expired:
                print(f"[invoice_expiry] {len(expired)} Rechnung(en) abgelaufen")
            conn.close()
        except Exception as e:
            print(f"[invoice_expiry] Fehler: {e}")
        await asyncio.sleep(24 * 3600)  # 24 Stunden warten


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(_weekly_reminder_loop())
    asyncio.create_task(_daily_invoice_expiry_loop())
