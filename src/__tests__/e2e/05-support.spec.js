// ── Test 5: Support-Formular ───────────────────────────────────────────────────
import { test, expect } from "@playwright/test";
import { setupLoggedIn, mockSupportAPI } from "./fixtures/helpers.js";

test.describe("Support & Feedback-Formular", () => {

  test.beforeEach(async ({ page }) => {
    await setupLoggedIn(page);
    await page.goto("/");
    await page.waitForSelector("text=Was möchtest du erstellen?", { timeout: 8000 });
  });

  // ── Test 5.1: Feedback erfolgreich absenden ───────────────────────────────
  test("5.1: Support-Formular öffnen, Text eingeben, absenden → Erfolg", async ({ page }) => {
    // Support-API mocken (kein echter Backend-Call)
    await mockSupportAPI(page);

    // Floating Support-Button finden (title="Feedback / Support")
    const supportBtn = page.locator("button[title='Feedback / Support']");
    await expect(supportBtn).toBeVisible({ timeout: 5000 });
    await supportBtn.click();

    // Modal öffnet
    await expect(page.locator("text=Feedback & Support")).toBeVisible({ timeout: 5000 });

    // Textarea ausfüllen
    await page.locator("textarea").fill("Playwright E2E-Test: Das ist eine automatisierte Testnachricht.");

    // Typ-Auswahl prüfen (Fehler / Idee / Lob)
    await expect(page.locator("button:has-text('Fehler')")).toBeVisible();
    await expect(page.locator("button:has-text('Idee')")).toBeVisible();
    await expect(page.locator("button:has-text('Lob')")).toBeVisible();

    // "Feedback senden" Button klicken
    const sendenBtn = page.getByRole("button", { name: /Feedback senden/ });
    await expect(sendenBtn).toBeEnabled();
    await sendenBtn.click();

    // Erfolgs-Meldung erscheint
    await expect(page.locator("text=Danke für dein Feedback!")).toBeVisible({ timeout: 8000 });
  });

  // ── Test 5.2: Leeres Formular kann nicht abgesendet werden ───────────────
  test("5.2: Leeres Support-Formular → Senden-Button deaktiviert", async ({ page }) => {
    // Support-Button öffnen
    const supportBtn = page.locator("button[title='Feedback / Support']");
    await expect(supportBtn).toBeVisible({ timeout: 5000 });
    await supportBtn.click();

    // Modal öffnet
    await expect(page.locator("text=Feedback & Support")).toBeVisible({ timeout: 5000 });

    // Textarea ist leer → Senden-Button ist disabled
    const textarea = page.locator("textarea");
    await expect(textarea).toHaveValue(""); // leer

    const sendenBtn = page.getByRole("button", { name: /Feedback senden/ });
    await expect(sendenBtn).toBeDisabled();

    // Formular schließen
    await page.locator("button:has-text('✕')").click();
    await expect(page.locator("text=Feedback & Support")).not.toBeVisible({ timeout: 3000 });
  });
});
