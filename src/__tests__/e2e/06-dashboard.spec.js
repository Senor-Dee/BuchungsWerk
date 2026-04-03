// ── Test 6: Dashboard / Navigation / Einstellungen ────────────────────────────
import { test, expect } from "@playwright/test";
import { setupLoggedIn } from "./fixtures/helpers.js";

test.describe("Dashboard, Navigation & Einstellungen", () => {

  test.beforeEach(async ({ page }) => {
    await setupLoggedIn(page);
    await page.goto("/");
    await page.waitForSelector("text=Was möchtest du erstellen?", { timeout: 8000 });
  });

  // ── Test 6.1: Startseite lädt korrekt mit Stepper + BottomBar ────────────
  test("6.1: Startseite zeigt Wizard-Stepper und BottomBar-Navigation", async ({ page }) => {
    // Stepper-Labels im TopBar (Thema, Unternehmen, Aufgaben)
    await expect(page.locator("text=Thema")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Unternehmen").first()).toBeVisible();
    await expect(page.getByText("Aufgaben", { exact: true }).first()).toBeVisible();

    // Logo sichtbar
    await expect(page.locator("text=BuchungsWerk")).toBeVisible();

    // BottomBar vorhanden: Bibliothek, AP-Übung, Klassenzimmer, Kontenplan
    await expect(page.getByRole("button", { name: /Bibliothek/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /AP-Übung/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Klassenzimmer/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Kontenplan/ })).toBeVisible();

    // Alle 3 Typ-Karten vorhanden (enthalten: Titel + Beschreibung)
    await expect(page.locator("button").filter({ hasText: "Aufgaben üben" })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: "Schulaufgabe erstellen" })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: "Firma führen" })).toBeVisible();

    // Klasse-Buttons erscheinen erst nach Typ-Auswahl (typ && <> in SchrittTyp)
    await page.locator("button").filter({ hasText: "Aufgaben üben" }).click();
    await expect(page.locator("button").filter({ hasText: /^7$/ }).first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator("button").filter({ hasText: /^10$/ }).first()).toBeVisible();
  });

  // ── Test 6.2: Kontenplan-Modal öffnen ────────────────────────────────────
  test("6.2: Kontenplan-Modal öffnet über BottomBar und zeigt IKR-Konten", async ({ page }) => {
    // Kontenplan-Button in der BottomBar
    const kontenplanBtn = page.getByRole("button", { name: /Kontenplan/ });
    await expect(kontenplanBtn).toBeVisible({ timeout: 5000 });
    await kontenplanBtn.click();

    // KontenplanModal erscheint – Header zeigt "Kontenplan Bayern" + "IKR"-Untertitel
    await expect(page.getByText("Kontenplan Bayern")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("IKR · BwR · Klassen 7–10")).toBeVisible();

    // Modal schließen (× Button oben rechts)
    await page.keyboard.press("Escape");
  });
});
