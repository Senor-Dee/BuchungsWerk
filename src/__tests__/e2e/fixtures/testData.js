// ── Test-Fixtures: Statische Testdaten für Playwright E2E ─────────────────────

// Fake JWT (weit in der Zukunft ablaufend – kein realer Backend-Call nötig)
export const FAKE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
  ".eyJzdWIiOiJ0ZXN0QGJ1Y2h1bmdzd2Vyay5sb2NhbCIsImV4cCI6OTk5OTk5OTk5OX0" +
  ".playwright_fake_token_not_for_production";

// Test-User (aus .env.test oder Fallback-Werte)
export const TEST_USER = {
  email:    process.env.PLAYWRIGHT_TEST_EMAIL    || "test@buchungswerk.local",
  password: process.env.PLAYWRIGHT_TEST_PASSWORD || "TestPass123!",
  vorname:  "Playwright",
  nachname: "Tester",
  schule:   "Testschule E2E",
};

// Modellunternehmen für Wizard-Tests
export const TEST_COMPANY = "LumiTec GmbH";

// Mock-Antwort für /ki/buchung
export const MOCK_KI_RESPONSE = {
  buchungssatz: [
    {
      soll: "2000", sollKuerzel: "H",
      haben: "2800", habenKuerzel: "BK",
      betrag: "1.190,00", punkte: 1,
    },
  ],
  aufgabe:
    "Die LumiTec GmbH kauft Rohstoffe (Siliziumscheiben). " +
    "Der Lieferant stellt eine Eingangsrechnung über 1.000,00 € netto aus. " +
    "Trage den Buchungssatz ein. Zahlungsziel: 30 Tage.",
  nebenrechnung:
    "1.000,00 € × 19 % = 190,00 € USt\nBrutto: 1.190,00 €",
  nebenrechnung_punkte: 1,
  erklaerung:
    "Beim Kauf von Rohstoffen wird das Rohstoffkonto (AWR) im Soll belastet " +
    "und das Verbindlichkeitskonto (VE) im Haben gebucht.",
  punkte_gesamt: 2,
};
