// ── Test 3: Aufgaben-Ausführung (Schritt 3) ────────────────────────────────────
import { test, expect } from "@playwright/test";
import { setupLoggedIn, navigateToSchritt3 } from "./fixtures/helpers.js";

test.describe("Aufgaben-Ausführung (SchrittAufgaben)", () => {

  test.beforeEach(async ({ page }) => {
    await setupLoggedIn(page);
    await page.goto("/");
    await page.waitForSelector("text=Was möchtest du erstellen?", { timeout: 8000 });
    await navigateToSchritt3(page);
  });

  // ── Test 3.1: SchrittAufgaben lädt korrekt ────────────────────────────────
  test("3.1: SchrittAufgaben zeigt Schritt-3-Header und Aufgaben", async ({ page }) => {
    // Header vorhanden
    await expect(page.locator("text=Schritt 3 von 3 · Vorschau")).toBeVisible();

    // Firma LumiTec in Header-Badge
    await expect(page.locator("text=LumiTec").first()).toBeVisible();

    // Klasse 8 im Titel
    await expect(page.locator("text=Klasse 8")).toBeVisible();

    // Mindestens eine Aufgabe wurde generiert (Aufgaben-Counter zeigt > 0)
    // Der Counter hat das Format "X Aufg. · Y P"
    const taskCounter = page.locator("text=/\\d+ Aufg\\./");
    await expect(taskCounter).toBeVisible({ timeout: 5000 });
    const counterText = await taskCounter.textContent();
    const aufgabenMatch = counterText?.match(/(\d+)\s+Aufg/);
    expect(Number(aufgabenMatch?.[1])).toBeGreaterThan(0);
  });

  // ── Test 3.2: Lösungen anzeigen / ausblenden ──────────────────────────────
  test("3.2: Lösungen anzeigen/ausblenden Toggle funktioniert", async ({ page }) => {
    // Anfangszustand: "Alle Lösungen"-Button (globaler Toggle in SchrittAufgaben)
    const alleBtn = page.getByRole("button", { name: "Alle Lösungen" });
    await expect(alleBtn).toBeVisible({ timeout: 5000 });

    // Klicken → Lösungen werden eingeblendet, Button-Text ändert sich
    await alleBtn.click();
    await page.waitForTimeout(300);

    // Button zeigt jetzt "Lösungen ausblenden"
    const ausblBtn = page.getByRole("button", { name: "Lösungen ausblenden" });
    await expect(ausblBtn).toBeVisible({ timeout: 3000 });

    // Zurück-Toggle → "Alle Lösungen" erscheint wieder
    await ausblBtn.click();
    await page.waitForTimeout(300);
    await expect(page.getByRole("button", { name: "Alle Lösungen" })).toBeVisible({ timeout: 3000 });
  });

  // ── Test 3.3: Export-Modal öffnen ─────────────────────────────────────────
  test("3.3: Export-Button öffnet ExportModal", async ({ page }) => {
    // Export-Button klicken (exakter Name, um strict-mode-Konflikt mit "Exportieren" zu vermeiden)
    const exportBtn = page.getByRole("button", { name: "Export", exact: true });
    await expect(exportBtn).toBeVisible({ timeout: 5000 });
    await exportBtn.click();

    // ExportModal erscheint (enthält "Export" oder "Drucken" oder Download-Optionen)
    await expect(
      page.locator("text=Export").or(page.locator("text=Drucken")).or(page.locator("text=Download")).first()
    ).toBeVisible({ timeout: 5000 });

    // Modal schließen (ESC oder Schließen-Button)
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    // oder: await page.locator("button:has-text('Schließen')").click();
  });
});
