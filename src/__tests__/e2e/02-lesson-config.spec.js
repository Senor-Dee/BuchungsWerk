// ── Test 2: Wizard-Navigation (Schritt 1–3) ────────────────────────────────────
import { test, expect } from "@playwright/test";
import { setupLoggedIn } from "./fixtures/helpers.js";
import { TEST_COMPANY } from "./fixtures/testData.js";

test.describe("Lektion konfigurieren (Wizard Schritt 1–2)", () => {

  test.beforeEach(async ({ page }) => {
    await setupLoggedIn(page);
    await page.goto("/");
    await page.waitForSelector("text=Was möchtest du erstellen?", { timeout: 8000 });
  });

  // ── Test 2.1: Vollständiger Wizard Schritt 1 → 2 → 3 ────────────────────
  test("2.1: Wizard Schritt 1 (Typ/Klasse) → Schritt 2 (Firma) → Schritt 3 (Aufgaben)", async ({ page }) => {
    // Schritt 1: Typ "Übung" auswählen
    // Button enthält: Icon + "Übung" + "Aufgaben üben" → Teiltext "Aufgaben üben" ist eindeutig
    await page.locator("button").filter({ hasText: "Aufgaben üben" }).click();

    // Klasse 8 wählen
    await page.locator("button").filter({ hasText: /^8$/ }).first().click();

    // Mindestens einen Lernbereich aufklappen
    await expect(page.locator("button").filter({ hasText: "▼" }).first()).toBeVisible({ timeout: 5000 });
    await page.locator("button").filter({ hasText: "▼" }).first().click();

    // "✓ Alle" auswählen um Themen zu aktivieren
    await expect(page.locator("button").filter({ hasText: "✓ Alle" }).first()).toBeVisible({ timeout: 5000 });
    await page.locator("button").filter({ hasText: "✓ Alle" }).first().click();

    // "Weiter: Unternehmen wählen →" Button prüfen und klicken
    const weiterBtn = page.getByRole("button", { name: /Weiter.*Unternehmen/ });
    await expect(weiterBtn).toBeEnabled({ timeout: 5000 });
    await weiterBtn.click();

    // Schritt 2: Modellunternehmen wählen
    await expect(page.locator("text=Modellunternehmen wählen")).toBeVisible({ timeout: 8000 });
    await expect(page.locator("text=Schritt 2 von 3")).toBeVisible();

    // LumiTec GmbH auswählen
    await page.locator("button").filter({ hasText: "LumiTec" }).click();

    // "Aufgaben generieren →" klicken
    const genBtn = page.getByRole("button", { name: /Aufgaben generieren/ });
    await expect(genBtn).toBeEnabled({ timeout: 3000 });
    await genBtn.click();

    // Schritt 3: SchrittAufgaben geladen
    await expect(page.locator("text=Schritt 3 von 3")).toBeVisible({ timeout: 10000 });
  });

  // ── Test 2.2: Zurück-Navigation (Schritt 2 → Schritt 1) ─────────────────
  test("2.2: Zurück-Button in Schritt 2 führt zu Schritt 1", async ({ page }) => {
    // Wizard bis Schritt 2 navigieren
    await page.locator("button").filter({ hasText: "Aufgaben üben" }).click();
    await page.locator("button").filter({ hasText: /^8$/ }).first().click();
    await page.locator("button").filter({ hasText: "▼" }).first().click();
    await page.locator("button").filter({ hasText: "✓ Alle" }).first().click();
    await page.getByRole("button", { name: /Weiter.*Unternehmen/ }).click();

    // Schritt 2 geladen
    await expect(page.locator("text=Modellunternehmen wählen")).toBeVisible({ timeout: 8000 });

    // "← Zurück" klicken
    await page.getByRole("button", { name: /Zurück/ }).click();

    // Schritt 1 zeigt wieder
    await expect(page.locator("text=Was möchtest du erstellen?")).toBeVisible({ timeout: 5000 });

    // Typ-Auswahl noch vorhanden (Übung war ausgewählt → Karte mit "Aufgaben üben" sichtbar)
    await expect(page.locator("button").filter({ hasText: "Aufgaben üben" })).toBeVisible();
  });
});
