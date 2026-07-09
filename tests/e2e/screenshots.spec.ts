import { test } from "@playwright/test";
import path from "path";
import fs from "fs";

const routes = [
  { name: "de-home", path: "/de" },
  { name: "us-home", path: "/us" },
  { name: "de-publisher", path: "/de/panini-marvel-icon" },
  { name: "de-series", path: "/de/panini-marvel-icon/marvel-horror-classic-collection-2022-vol1" },
  { name: "de-issue", path: "/de/panini-marvel-icon/marvel-horror-classic-collection-2022-vol1/1" },
  { name: "filter-de", path: "/filter/de" },
  { name: "filter-us", path: "/filter/us" },
  { name: "login", path: "/login" },
];

const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];

const themes = ["light", "dark"] as const;

test.describe("Capture Page Screenshots", () => {
  const outputDir = path.join(__dirname, "../../screenshots");

  test.beforeAll(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  // 1. Static page screenshots for all routes, viewports, and themes
  for (const theme of themes) {
    for (const viewport of viewports) {
      for (const route of routes) {
        test(`Screenshot ${viewport.name} - ${theme} - ${route.name}`, async ({ page }) => {
          // Force light/dark mode via local storage
          await page.addInitScript((mode) => {
            window.localStorage.setItem("shortbox_theme_mode", mode);
          }, theme);

          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await page.goto(route.path, { waitUntil: "domcontentloaded" });
          
          // Wait for lazy images and components to render
          await page.waitForTimeout(1500);

          const screenshotPath = path.join(outputDir, `${viewport.name}-${theme}-${route.name}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          console.log(`Saved screenshot: ${screenshotPath}`);
        });
      }
    }
  }

  // 2. Interactive: Search Suggestions Dropdown (Desktop)
  for (const theme of themes) {
    test(`Interactive Search Suggestions - desktop - ${theme}`, async ({ page }) => {
      await page.addInitScript((mode) => {
        window.localStorage.setItem("shortbox_theme_mode", mode);
      }, theme);

      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/de", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);

      // Search input toggle
      const searchInput = page.locator('input[data-shortbox-search-input="true"]').first();
      await searchInput.click();
      await searchInput.fill("Zombie");
      await page.waitForTimeout(2000); // Wait for results fetch

      const screenshotPath = path.join(outputDir, `desktop-${theme}-interactive-search.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`Saved interactive search: ${screenshotPath}`);
    });
  }

  // 3. Interactive: Mobile Sidebar Navigation Open (Mobile)
  for (const theme of themes) {
    test(`Interactive Sidebar Open - mobile - ${theme}`, async ({ page }) => {
      await page.addInitScript((mode) => {
        window.localStorage.setItem("shortbox_theme_mode", mode);
      }, theme);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/de", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);

      // Click menu toggle in bottom bar
      const menuButton = page.locator('[aria-label="Navigation umschalten"]').first();
      await menuButton.click();
      await page.waitForTimeout(1500); // wait for slide-in drawer transition

      const screenshotPath = path.join(outputDir, `mobile-${theme}-interactive-sidebar-open.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`Saved interactive mobile sidebar: ${screenshotPath}`);
    });
  }

  // 4. Interactive: Desktop Sidebar Closed (Desktop)
  for (const theme of themes) {
    test(`Interactive Sidebar Closed - desktop - ${theme}`, async ({ page }) => {
      await page.addInitScript((mode) => {
        window.localStorage.setItem("shortbox_theme_mode", mode);
      }, theme);

      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/de", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);

      // Click menu toggle to close sidebar (open by default)
      const menuButton = page.locator('[aria-label="Navigation umschalten"]').first();
      await menuButton.click();
      await page.waitForTimeout(1000);

      const screenshotPath = path.join(outputDir, `desktop-${theme}-interactive-sidebar-closed.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Saved interactive desktop sidebar closed: ${screenshotPath}`);
    });
  }

  // 5. Interactive: Filter page accordions expanded (Mobile)
  for (const theme of themes) {
    test(`Interactive Filter Accordions - mobile - ${theme}`, async ({ page }) => {
      await page.addInitScript((mode) => {
        window.localStorage.setItem("shortbox_theme_mode", mode);
      }, theme);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/filter/de", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);

      // Expand "Inhalt" accordion
      const contentAccordion = page.locator('.MuiAccordionSummary-root', { hasText: 'Inhalt' }).first();
      await contentAccordion.click();
      await page.waitForTimeout(600);

      // Expand "Mitwirkende" accordion
      const contribsAccordion = page.locator('.MuiAccordionSummary-root', { hasText: 'Mitwirkende' }).first();
      await contribsAccordion.click();
      await page.waitForTimeout(600);

      const screenshotPath = path.join(outputDir, `mobile-${theme}-interactive-filter-expanded.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Saved interactive filter expanded: ${screenshotPath}`);
    });
  }
});
