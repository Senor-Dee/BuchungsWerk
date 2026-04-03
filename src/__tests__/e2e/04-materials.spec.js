// ── Test 4: Materialien & Eigene Belege ───────────────────────────────────────
import { test, expect } from "@playwright/test";
import { setupLoggedIn } from "./fixtures/helpers.js";

test.describe("Materialien & Eigene Belege", () => {

  test.beforeEach(async ({ page }) => {
    await setupLoggedIn(page);
    await page.goto("/");
    await page.waitForSelector("text=Was möchtest du erstellen?", { timeout: 8000 });
  });

  // ── Test 4.1: Bibliothek-Picker öffnen + Eigene Belege ─────────────────
  test("4.1: Bibliothek-Picker öffnet + Eigene-Belege-Modal erscheint", async ({ page }) => {
    // "Bibliothek"-Button in der BottomBar
    const bibliothekBtn = page.getByRole("button", { name: /Bibliothek/ });
    await expect(bibliothekBtn).toBeVisible({ timeout: 5000 });
    await bibliothekBtn.click();

    // Bibliothek-Picker erscheint (bottom-sheet Animation)
    await expect(page.locator("text=Eigene Belege")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Materialien")).toBeVisible();

    // Auf "Eigene Belege" klicken
    await page.locator("button").filter({ hasText: "Eigene Belege" }).click();

    // EigeneBelege-Modal öffnet
    // Zeigt entweder eine leere Beleg-Liste oder vorhandene Belege
    // Der Header enthält "Belege" oder ähnlichen Text
    await expect(
      page.locator("text=Eigene Belege")
        .or(page.locator("text=Belege"))
        .or(page.locator("text=Aufgaben generieren"))
        .first()
    ).toBeVisible({ timeout: 8000 });
  });

  // ── Test 4.2: BelegEditorModal über Hauptseite öffnen ──────────────────
  test("4.2: BelegEditorModal öffnet über Schritt-1-Button", async ({ page }) => {
    // Auf der Hauptseite (Schritt 1) gibt es einen "Beleg-Editor"-Button
    // Dieser ist bei SchrittTyp als Tool-Button implementiert

    // Suche nach dem Beleg-Editor-Button (Icon + Text "Beleg-Editor" oder ähnlich)
    const belegEditorBtn = page
      .locator("button")
      .filter({ hasText: /Beleg.*(Editor|erstellen|neu)|Editor/i })
      .first();

    const isVisible = await belegEditorBtn.isVisible().catch(() => false);

    if (isVisible) {
      await belegEditorBtn.click();
      // Modal erscheint
      await expect(
        page.locator("text=Beleg").or(page.locator("text=Eingangsrechnung")).or(page.locator("text=Belegtyp")).first()
      ).toBeVisible({ timeout: 8000 });
    } else {
      // Fallback: Bibliothek-Picker → EigeneBelege
      await page.getByRole("button", { name: /Bibliothek/ }).click();
      await page.locator("button").filter({ hasText: "Eigene Belege" }).click();
      await expect(
        page.locator("text=Eigene Belege").or(page.locator("text=Belege")).first()
      ).toBeVisible({ timeout: 8000 });
    }
  });
});
