import { expect, test, type Page } from "@playwright/test";

const DE_HOME = "/de";
const US_HOME = "/us";
const DE_PUBLISHER = "/de/panini-marvel-icon";
const DE_SERIES = "/de/panini-marvel-icon/marvel-horror-classic-collection-2022-vol1";
const DE_ISSUE = "/de/panini-marvel-icon/marvel-horror-classic-collection-2022-vol1/1/hardcover";
const US_ISSUE = "/us/marvel-comics/tomb-of-dracula-1972-vol1/34/heft";

async function waitForNavigationChrome(page: Page) {
  const loading = page.getByLabel("Navigation wird geladen");
  await loading.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
}

test("loads the de home shell", async ({ page }) => {
  await page.goto(DE_HOME, { waitUntil: "networkidle" });

  await expect(page).toHaveURL(/\/de$/);
  await expect(page.getByRole("link", { name: "Zur Startseite" })).toBeVisible();
  await expect(page.getByText("All-New, All-Different Shortbox")).toBeVisible();
  await expect(page.getByLabel("Shortbox durchsuchen")).toBeVisible();
});

test("loads the us home shell", async ({ page }) => {
  await page.goto(US_HOME, { waitUntil: "networkidle" });

  await expect(page).toHaveURL(/\/us$/);
  await expect(page.getByRole("link", { name: "Zur Startseite" })).toBeVisible();
  await expect(page.getByText("All-New, All-Different Shortbox")).toBeVisible();
  await expect(page.getByLabel("Shortbox durchsuchen")).toBeVisible();
});

test("navigates from publisher to series to issue on canonical de routes", async ({ page }) => {
  await page.goto(DE_PUBLISHER, { waitUntil: "networkidle" });
  await waitForNavigationChrome(page);

  const seriesRow = page
    .locator("[data-nav-row-key]")
    .filter({ hasText: "Marvel Horror Classic Collection" })
    .first();
  await expect(seriesRow).toBeVisible();
  await seriesRow.click();

  await expect(page).toHaveURL(new RegExp(`${DE_SERIES}$`));

  const issueRow = page
    .locator("[data-nav-row-key]")
    .filter({ hasText: "#1 Marvel Horror Classic Collection" })
    .first();
  await expect(issueRow).toBeVisible();
  await issueRow.click();

  await expect(page).toHaveURL(new RegExp(`${DE_ISSUE}$`));
});

test("keeps the selected path visible on the seeded de issue route", async ({ page }) => {
  await page.goto(DE_ISSUE, { waitUntil: "networkidle" });
  await waitForNavigationChrome(page);

  await expect(
    page
      .locator("[data-nav-row-key].Mui-selected")
      .filter({ hasText: "#1 Marvel Horror Classic Collection" })
      .first()
  ).toBeVisible();
});

test("searches from the de home page and navigates to a seeded result", async ({ page }) => {
  await page.goto(DE_HOME, { waitUntil: "networkidle" });

  const searchInput = page.getByLabel("Shortbox durchsuchen");
  await expect(searchInput).toBeVisible();
  await searchInput.fill("Marvel Horror Classic Collection");

  const firstResult = page.getByRole("option").first();
  await expect(firstResult).toBeVisible();
  await firstResult.click();

  await expect(page).toHaveURL(/\/de\/.*marvel-horror-classic-collection/);
});

test("loads a seeded us issue route and highlights the selected issue", async ({ page }) => {
  await page.goto(US_ISSUE, { waitUntil: "networkidle" });
  await waitForNavigationChrome(page);

  await expect(
    page
      .locator("[data-nav-row-key].Mui-selected")
      .filter({ hasText: "#34 Tomb of Dracula" })
      .first()
  ).toBeVisible();
});

test.describe("mobile shell", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens the navigation drawer from the mobile bottom bar", async ({ page }) => {
    await page.goto(DE_HOME, { waitUntil: "networkidle" });

    await expect(page.getByTestId("mobile-bottom-bar")).toBeVisible();
    await page.getByRole("button", { name: "Navigation umschalten" }).click();

    await expect(page.getByLabel("Zur Auswahl")).toBeVisible();
  });
});
