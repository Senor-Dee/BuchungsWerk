// ── E2E-Test-Helpers: Auth-Setup + API-Mocking ─────────────────────────────────
import { FAKE_JWT, TEST_USER, MOCK_KI_RESPONSE } from "./testData.js";

/**
 * Setzt Auth-State (localStorage) vor dem Laden der Seite.
 * Muss VOR page.goto() aufgerufen werden!
 * Mockt zusätzlich /auth/me damit der UserBadge keine 401-Fehler bekommt.
 */
export async function setupLoggedIn(page) {
  // localStorage via addInitScript setzen (wird vor React-Render ausgeführt)
  await page.addInitScript((args) => {
    localStorage.setItem("bw_token", args.token);
    localStorage.setItem("bw_user", JSON.stringify(args.user));
    localStorage.setItem("bw_disclaimer_ok", "1");
  }, {
    token: FAKE_JWT,
    user: {
      email:   TEST_USER.email,
      vorname: TEST_USER.vorname,
      nachname: TEST_USER.nachname,
      schule:  TEST_USER.schule,
    },
  });

  // /auth/me mocken damit UserBadge nicht 401 bekommt
  await page.route("**/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        email:   TEST_USER.email,
        vorname: TEST_USER.vorname,
        nachname: TEST_USER.nachname,
        schule:  TEST_USER.schule,
        is_admin: false,
      }),
    });
  });
}

/**
 * Mockt den /auth/login Endpunkt mit einem Fake-Token.
 * Für Test 1.1 (Login-Flow via UI).
 */
export async function mockLoginAPI(page) {
  await page.route("**/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token: FAKE_JWT,
        user: {
          email:   TEST_USER.email,
          vorname: TEST_USER.vorname,
          nachname: TEST_USER.nachname,
          schule:  TEST_USER.schule,
        },
      }),
    });
  });
}

/**
 * Mockt den /ki/buchung KI-Endpunkt.
 * Spart echte Tokens – gibt deterministische Testantwort zurück.
 */
export async function mockKIAPI(page) {
  await page.route("**/ki/buchung", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_KI_RESPONSE),
    });
  });
}

/**
 * Mockt den /support POST-Endpunkt.
 */
export async function mockSupportAPI(page) {
  await page.route("**/support", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Navigiert den Wizard vollständig bis zu SchrittAufgaben (Schritt 3).
 * Voraussetzung: page ist geladen, Auth gesetzt.
 */
export async function navigateToSchritt3(page) {
  // Schritt 1: Typ "Übung" wählen
  // Button enthält: Icon + "Übung" + "Aufgaben üben" → Teiltext "Aufgaben üben" ist eindeutig
  await page.locator("button").filter({ hasText: "Aufgaben üben" }).click();

  // Klasse 8 wählen (exakt "8" – kein Match auf "18", "80" etc.)
  await page.locator("button").filter({ hasText: /^8$/ }).first().click();

  // Ersten Lernbereich aufklappen und alle Themen auswählen
  await page.locator("button").filter({ hasText: "▼" }).first().click();
  await page.locator("button").filter({ hasText: "✓ Alle" }).first().click();

  // Weiter zu SchrittFirma
  await page.getByRole("button", { name: /Weiter.*Unternehmen/ }).click();
  await page.waitForSelector("text=Modellunternehmen wählen", { timeout: 8000 });

  // LumiTec GmbH wählen
  await page.locator("button").filter({ hasText: "LumiTec" }).click();

  // Weiter zu SchrittAufgaben
  await page.getByRole("button", { name: /Aufgaben generieren/ }).click();

  // Warten bis SchrittAufgaben geladen ist
  await page.waitForSelector("text=Schritt 3 von 3", { timeout: 10000 });
}
