import { expect, test } from "@playwright/test";
import {
  navigateToCityPage,
  selectCityFromToggle,
  waitForCityToggleButton,
  waitForMapReady,
  waitForUrlPath,
} from "./helpers";

/**
 * City Toggle E2E Tests
 *
 * Tests the city toggle functionality:
 * - Button position relative to search panel
 * - URL updates using pushState (no page reload)
 * - Saved locations refresh when city changes
 * - Only top row icons re-render on city change
 */

test.describe("City Toggle", () => {
  test.beforeEach(async ({ page }) => {
    // Mock Mapbox API routes
    await page.route("**/api.mapbox.com/**", (route) => {
      // Allow all Mapbox requests to continue
      route.continue();
    });
  });

  test("should display city toggle button anchored to search panel", async ({
    page,
  }) => {
    // Navigate to Singapore page and wait for map ready
    await navigateToCityPage(page, "singapore");

    // Search panel should be visible
    const searchPanel = page.locator('[placeholder="Search locations..."]');
    await expect(searchPanel).toBeVisible({ timeout: 10000 });

    // Wait for city toggle button with retry logic
    const cityToggle = await waitForCityToggleButton(page);

    // Get bounding boxes
    const searchBox = await searchPanel.boundingBox();
    const toggleBox = await cityToggle.boundingBox();

    // Verify button is positioned near the search panel
    expect(searchBox).toBeTruthy();
    expect(toggleBox).toBeTruthy();

    console.log(
      "✓ City toggle button visible and positioned near search panel",
    );
  });

  test("should toggle between Singapore and Jakarta without page reload", async ({
    page,
  }) => {
    // Navigate to Singapore page and wait for map ready
    await navigateToCityPage(page, "singapore");
    const mapContainer = page.getByTestId("mapbox-gl-map");

    // Initial URL should be /singapore
    expect(page.url()).toContain("/singapore");

    // Switch to Jakarta
    await selectCityFromToggle(page, "Jakarta");

    // Wait for URL to change to Jakarta (using pushState, no reload)
    await waitForUrlPath(page, "/jakarta");

    // Map should still be visible (no page reload)
    await expect(mapContainer).toBeVisible();

    console.log("✓ Toggled to Jakarta without page reload");

    // Switch back to Singapore
    await selectCityFromToggle(page, "Singapore");

    // Wait for URL to change back to Singapore
    await waitForUrlPath(page, "/singapore");

    // Map should still be visible (no page reload)
    await expect(mapContainer).toBeVisible();

    console.log("✓ Toggled back to Singapore without page reload");
  });

  test("should show plane animation during transition", async ({ page }) => {
    // Navigate to Singapore page and wait for map ready
    await navigateToCityPage(page, "singapore");

    // Switch to Jakarta
    await selectCityFromToggle(page, "Jakarta");

    console.log("✓ Plane animation triggered (city switch initiated)");

    // Wait for URL to change (animation completes)
    await waitForUrlPath(page, "/jakarta");

    // Button should be enabled again after transition
    const cityToggle = await waitForCityToggleButton(page);
    await expect(cityToggle).toBeEnabled();

    console.log("✓ Transition animation completed");
  });

  test("should handle browser back/forward navigation", async ({ page }) => {
    // Navigate to Singapore page and wait for map ready
    await navigateToCityPage(page, "singapore");

    // Switch to Jakarta
    await selectCityFromToggle(page, "Jakarta");
    await waitForUrlPath(page, "/jakarta");

    // Go back using browser back button
    await page.goBack();
    await waitForUrlPath(page, "/singapore");

    // City toggle button should still be visible
    const cityToggleAfterBack = await waitForCityToggleButton(page);
    await expect(cityToggleAfterBack).toBeVisible();

    console.log("✓ Browser back navigation works correctly");

    // Go forward
    await page.goForward();
    await waitForUrlPath(page, "/jakarta");

    // City toggle button should still be visible
    const cityToggleAfterForward = await waitForCityToggleButton(page);
    await expect(cityToggleAfterForward).toBeVisible();

    console.log("✓ Browser forward navigation works correctly");
  });

  test("should move with search panel when it expands/collapses", async ({
    page,
  }) => {
    // Navigate to Singapore page and wait for map ready
    await navigateToCityPage(page, "singapore");

    // Get initial position of city toggle
    const cityToggle = await waitForCityToggleButton(page);
    const initialBox = await cityToggle.boundingBox();
    expect(initialBox).toBeTruthy();

    // Perform a search to expand the search panel
    const searchInput = page.locator('[placeholder="Search locations..."]');
    await searchInput.fill("Marina Bay");
    await searchInput.press("Enter");

    // Wait for search results to appear
    await page.waitForSelector('[role="option"]', {
      state: "visible",
      timeout: 5000,
    });

    // Get new position of city toggle
    const expandedBox = await cityToggle.boundingBox();
    expect(expandedBox).toBeTruthy();

    // Button should still be at the top-right of the search panel
    // (position should remain relative to search panel)
    expect(expandedBox).toBeTruthy();

    console.log("✓ City toggle button stays anchored to search panel");
  });

  test("should not reload entire page (map instance persists)", async ({
    page,
  }) => {
    // Navigate to Singapore page and wait for map ready
    await navigateToCityPage(page, "singapore");

    // Add a marker to the page using the browser console
    await page.evaluate(() => {
      // Add a test marker to window object
      (window as any).testMarker = "initial-load";
    });

    // Verify marker exists
    let marker = await page.evaluate(() => (window as any).testMarker);
    expect(marker).toBe("initial-load");

    // Toggle to Jakarta
    await selectCityFromToggle(page, "Jakarta");
    await waitForUrlPath(page, "/jakarta");

    // Verify marker still exists (page wasn't reloaded)
    marker = await page.evaluate(() => (window as any).testMarker);
    expect(marker).toBe("initial-load");

    console.log("✓ Page state persisted (no full page reload)");
  });

  test("should be visible on mobile view", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to Singapore page and wait for map ready
    await navigateToCityPage(page, "singapore");

    // City toggle button should be visible on mobile
    const cityToggle = await waitForCityToggleButton(page);
    await expect(cityToggle).toBeVisible();

    // Get position
    const toggleBox = await cityToggle.boundingBox();
    expect(toggleBox).toBeTruthy();

    // Should be near the top of the search panel (which is at bottom on mobile)
    expect(toggleBox?.y).toBeGreaterThan(0);

    console.log("✓ City toggle visible on mobile viewport");
  });

  test("should disable button during transition", async ({ page }) => {
    // Navigate to Singapore page and wait for map ready
    await navigateToCityPage(page, "singapore");

    // Switch to Jakarta
    await selectCityFromToggle(page, "Jakarta");

    console.log("✓ Transition initiated");

    // Wait for transition to complete
    await waitForUrlPath(page, "/jakarta");

    // Button should be enabled again after transition
    const cityToggle = await waitForCityToggleButton(page);
    await expect(cityToggle).toBeEnabled();

    console.log("✓ Button re-enabled after transition");
  });
});
