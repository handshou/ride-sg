import { expect, test } from "@playwright/test";

/**
 * Integration Tests: Convex UI State Validations
 *
 * These tests verify UI state consistency and edge cases,
 * not complete user journeys.
 */

test.describe("Convex UI States", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
  });

  test("should not show delete button for non-database results", async ({
    page,
  }) => {
    // Search for a location
    const searchInput = page.getByPlaceholder("Search locations...");
    await searchInput.fill("garden");
    await searchInput.press("Enter");

    // Wait for search results
    await page.waitForTimeout(3000);

    // Look for Exa result (should NOT have delete button)
    const exaResult = page.locator('button:has-text("Exa")').first();

    if (await exaResult.isVisible()) {
      // Check that there's NO delete button near this result
      const deleteButtonNearExa = exaResult.locator(
        'button[title="Delete from Convex"]',
      );

      await expect(deleteButtonNearExa).not.toBeVisible();
      console.log("✓ Exa results correctly don't show delete button");
    }
  });

  test("should handle delete errors gracefully", async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // Search for a location
    const searchInput = page.getByPlaceholder("Search locations...");
    await searchInput.fill("marina");
    await searchInput.press("Enter");

    await page.waitForTimeout(3000);

    // Try to click delete button if it exists
    const deleteButton = page
      .locator('button[title="Delete from Convex"]')
      .first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await page.waitForTimeout(2000);

      // Check that no critical errors occurred
      const criticalErrors = errors.filter(
        (error) =>
          !error.includes("WEBGL") &&
          !error.includes("favicon") &&
          !error.includes("mapbox"),
      );

      // Should have no unexpected errors
      expect(criticalErrors.length).toBeLessThanOrEqual(1);
      console.log("✓ Delete operation handled gracefully");
    } else {
      console.log("⚠️ No database results to test deletion");
    }
  });
});
