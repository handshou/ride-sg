import { expect, test } from "@playwright/test";

test.describe("Singapore Map Explorer E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for the page to fully load
    await page.waitForLoadState("networkidle");
    // Wait for map to initialize (look for "Map ready" in console)
    await page.waitForTimeout(1000);
  });

  test("should display the interactive map", async ({ page }) => {
    // Check that the map container is visible
    const mapContainer = page.getByTestId("mapbox-gl-map");
    await expect(mapContainer).toBeVisible();

    // Map should be loaded (no loading spinner)
    await expect(page.locator(".animate-spin")).not.toBeVisible();
  });

  test("should display map controls", async ({ page }) => {
    // Check for map style selector
    await expect(page.getByTestId("map-style-selector")).toBeVisible();

    // Check for random coordinates button
    await expect(
      page.getByRole("button", { name: /🎲 Generate Random Coordinates/ }),
    ).toBeVisible();

    // Check for locate me button
    await expect(
      page.getByRole("button", { name: /📍 Locate Me/ }),
    ).toBeVisible();
  });

  test("should display search panel", async ({ page }) => {
    // Check for search input
    const searchInput = page.getByPlaceholder("Search locations...");
    await expect(searchInput).toBeVisible();
  });

  test("should display coordinates", async ({ page }) => {
    // Check for coordinates display
    await expect(page.getByText(/Random Location|Your Location/)).toBeVisible();

    // Check for coordinate numbers (latitude, longitude format)
    await expect(page.locator("text=/\\d+\\.\\d+/")).toBeVisible();
  });

  test("should handle random coordinates button click", async ({ page }) => {
    const button = page.getByRole("button", {
      name: /🎲 Generate Random Coordinates/,
    });
    await button.click();

    // Wait for animation and toast
    await page.waitForTimeout(2000);

    // Should still show coordinates
    await expect(page.getByText(/Random Location/)).toBeVisible();
  });

  test("should handle locate me button click", async ({ page }) => {
    const button = page.getByRole("button", { name: /📍 Locate Me/ });
    await button.click();

    // Wait for geolocation (may be denied)
    await page.waitForTimeout(2000);

    // Should still be on the page
    await expect(page.getByTestId("mapbox-gl-map")).toBeVisible();
  });

  test("should handle search functionality", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search locations...");
    await searchInput.fill("garden");

    // Press Enter or click search button
    await searchInput.press("Enter");

    // Wait for search results
    await page.waitForTimeout(1500);

    // Search results should appear (if any)
    // This is a mock implementation, so we should see "Search for locations in Singapore" or results
    const searchPanel = page.locator(".absolute.top-20.left-4");
    await expect(searchPanel).toBeVisible();
  });

  test("should handle map style changes", async ({ page }) => {
    const styleSelector = page.getByTestId("map-style-selector");
    await styleSelector.click({ force: true });

    // Wait for dropdown
    await page.waitForTimeout(300);

    // Click on dark style (if visible)
    const darkOption = page.getByRole("menuitem", { name: /Dark/i });
    if (await darkOption.isVisible()) {
      await darkOption.click({ force: true });
      await page.waitForTimeout(1000);
    }

    // Map should still be visible
    await expect(page.getByTestId("mapbox-gl-map")).toBeVisible();
  });

  test("should initialize map only once", async ({ page }) => {
    // Listen for console logs
    const mapReadyLogs: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("Map ready, flying to initial location")) {
        mapReadyLogs.push(msg.text());
      }
    });

    // Reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Should only see "Map ready" once
    expect(mapReadyLogs.length).toBeLessThanOrEqual(1);
  });

  test("should be responsive on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that map is still visible
    await expect(page.getByTestId("mapbox-gl-map")).toBeVisible();

    // Check that controls are still accessible
    await expect(
      page.getByRole("button", { name: /🎲 Generate Random Coordinates/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /📍 Locate Me/ }),
    ).toBeVisible();
  });

  test("should not have critical JavaScript errors", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // Wait for page to load
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (error) =>
        !error.includes("WEBGL_debug_renderer_info") &&
        !error.includes("-ms-high-contrast") &&
        !error.includes("mapbox") &&
        !error.toLowerCase().includes("favicon"),
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
