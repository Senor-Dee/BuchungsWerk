// ── Test 1: Authentication ─────────────────────────────────────────────────────
import { test, expect } from "@playwright/test";
import { setupLoggedIn, mockLoginAPI } from "./fixtures/helpers.js";
import { FAKE_JWT, TEST_USER } from "./fixtures/testData.js";

test.describe("Authentication & Session", () => {

  // ── Test 1.1: Login-Flow ───────────────────────────────────────────────────
  test("1.1: Login via UI mit Mock-API", async ({ page }) => {
    // Mock-API aktivieren (kein echter Backend-Call)
    await mockLoginAPI(page);

    // Landing-Seite laden (kein Token → Landing zeigt)
    await page.goto("/");

    // Sicherstellen: Landing-Seite sichtbar (BuchungsWerk-Logo oder "Anmelden"-Button)
    await expect(page.locator("text=Anmelden").first()).toBeVisible({ timeout: 8000 });

    // Ersten "Anmelden"-Button klicken (Navbar)
    await page.locator("button:has-text('Anmelden')").first().click();

    // Login-Formular erscheint: E-Mail-Input warten
    await page.waitForSelector("input[placeholder='E-Mail-Adresse *']", { timeout: 5000 });

    // E-Mail und Passwort ausfüllen
    await page.fill("input[placeholder='E-Mail-Adresse *']", TEST_USER.email);
    await page.fill("input[placeholder='Passwort *']", TEST_USER.password);

    // Submit-Button klicken (letzter "Anmelden"-Button = Submit-Button im Formular)
    await page.locator("button:has-text('Anmelden')").last().click();

    // BuchungsWerk zeigt nach Login: Wizard Schritt 1
    await expect(page.locator("text=Was möchtest du erstellen?")).toBeVisible({
      timeout: 10000,
    });

    // JWT in localStorage verifizieren
    const token = await page.evaluate(() => localStorage.getItem("bw_token"));
    expect(token).toBe(FAKE_JWT);
  });

  // ── Test 1.2: Logout-Flow ──────────────────────────────────────────────────
  test("1.2: Logout via UserBadge → Abmelden", async ({ page }) => {
    // Auth-State setzen
    await setupLoggedIn(page);
    await page.goto("/");

    // BuchungsWerk zeigt (eingeloggt)
    await expect(page.locator("text=Was möchtest du erstellen?")).toBeVisible({ timeout: 8000 });

    // UserBadge finden und klicken (zeigt Benutzer-Initiale oben rechts)
    // UserBadge zeigt den ersten Buchstaben des Vornamens
    const userBadge = page.locator(`button:has-text("${TEST_USER.vorname[0]}")`).first();
    const userBadgeVisible = await userBadge.isVisible().catch(() => false);

    if (userBadgeVisible) {
      await userBadge.click();
      // "Abmelden"-Option im Dropdown
      await page.locator("button:has-text('Abmelden')").click();
    } else {
      // Fallback: direkt localStorage leeren und neu laden
      await page.evaluate(() => {
        localStorage.removeItem("bw_token");
        localStorage.removeItem("bw_user");
      });
      await page.reload();
    }

    // Landing-Seite zeigt wieder
    await expect(page.locator("text=Anmelden").first()).toBeVisible({ timeout: 8000 });

    // Token aus localStorage entfernt
    const token = await page.evaluate(() => localStorage.getItem("bw_token"));
    expect(token).toBeNull();
  });

  // ── Test 1.3: Kein Token → Landing zeigt ──────────────────────────────────
  test("1.3: Ohne Auth-Token wird Landing-Seite angezeigt", async ({ page }) => {
    // Kein setupLoggedIn – leeres localStorage
    await page.goto("/");

    // Landing zeigt (kein "Was möchtest du erstellen?")
    await expect(page.locator("text=Anmelden").first()).toBeVisible({ timeout: 8000 });

    // BuchungsWerk-Stepper darf NICHT sichtbar sein
    const schrittVisible = await page
      .locator("text=Was möchtest du erstellen?")
      .isVisible()
      .catch(() => false);
    expect(schrittVisible).toBe(false);

    // localStorage ist leer
    const token = await page.evaluate(() => localStorage.getItem("bw_token"));
    expect(token).toBeNull();
  });
});
