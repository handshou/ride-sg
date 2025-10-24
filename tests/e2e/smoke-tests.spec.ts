import { expect, test } from "@playwright/test";

/**
 * Smoke Tests: Quick health checks for critical functionality
 *
 * These tests verify the app is working at a basic level.
 * Should run fast and catch major breakages.
 */

test.describe("Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
  });

  test("should not have critical JavaScript errors", async ({ page }) => {
    const errors: string[] = [];

    // Collect console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // Wait for page to fully load and initialize
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (error) =>
        !error.includes("WEBGL_debug_renderer_info") &&
        !error.includes("-ms-high-contrast") &&
        !error.includes("mapbox") &&
        !error.toLowerCase().includes("favicon"),
    );

    // Report findings
    if (criticalErrors.length > 0) {
      console.log("❌ Critical JavaScript errors detected:");
      for (const error of criticalErrors) {
        console.log(`  - ${error}`);
      }
    } else {
      console.log("✓ No critical JavaScript errors");
    }

    expect(criticalErrors).toHaveLength(0);
  });

  test("should load essential UI elements", async ({ page }) => {
    // Check map container
    const mapContainer = page.getByTestId("mapbox-gl-map");
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Check search input
    const searchInput = page.getByPlaceholder("Search locations...");
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Check at least one control button is visible
    const controls = page.locator("button").first();
    await expect(controls).toBeVisible();

    console.log("✓ All essential UI elements loaded");
  });
});
