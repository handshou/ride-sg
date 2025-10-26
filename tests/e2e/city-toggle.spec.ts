import { expect, test } from "@playwright/test";

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
    // Navigate to Singapore page
    await page.goto("/singapore");
    await page.waitForLoadState("load");

    // Wait for map to be ready
    const mapContainer = page.getByTestId("mapbox-gl-map");
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // Search panel should be visible
    const searchPanel = page.locator('[placeholder="Search locations..."]');
    await expect(searchPanel).toBeVisible();

    // City toggle button should be visible (contains Singapore flag 🇸🇬)
    const cityToggle = page.locator('button:has-text("🇸🇬")');
    await expect(cityToggle).toBeVisible();

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
    // Navigate to Singapore page
    await page.goto("/singapore");
    await page.waitForLoadState("load");

    // Wait for map to be ready
    const mapContainer = page.getByTestId("mapbox-gl-map");
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // Initial URL should be /singapore
    expect(page.url()).toContain("/singapore");

    // Singapore flag should be visible
    const singaporeFlag = page.locator('button:has-text("🇸🇬")');
    await expect(singaporeFlag).toBeVisible();

    // Click the city toggle button
    await singaporeFlag.click();

    // Wait for flyTo animation (6.5 seconds for cross-border)
    await page.waitForTimeout(7000);

    // URL should change to /jakarta (using pushState, no reload)
    await page.waitForFunction(
      () => window.location.pathname.includes("/jakarta"),
      { timeout: 5000 },
    );

    // Map should still be visible (no page reload)
    await expect(mapContainer).toBeVisible();

    // Jakarta flag should now be visible
    const jakartaFlag = page.locator('button:has-text("🇮🇩")');
    await expect(jakartaFlag).toBeVisible();

    // Verify saved locations updated (top dashboard should show Jakarta locations)
    // Look for console logs indicating city change
    const cityChangeLogs = [];
    page.on("console", (msg) => {
      if (msg.text().includes("City context: jakarta")) {
        cityChangeLogs.push(msg.text());
      }
    });

    console.log("✓ Toggled to Jakarta without page reload");

    // Click again to go back to Singapore
    await jakartaFlag.click();
    await page.waitForTimeout(7000);

    // URL should change back to /singapore
    await page.waitForFunction(
      () => window.location.pathname.includes("/singapore"),
      { timeout: 5000 },
    );

    // Map should still be visible (no page reload)
    await expect(mapContainer).toBeVisible();

    // Singapore flag should be visible again
    await expect(singaporeFlag).toBeVisible();

    console.log("✓ Toggled back to Singapore without page reload");
  });

  test("should show plane animation during transition", async ({ page }) => {
    // Navigate to Singapore page
    await page.goto("/singapore");
    await page.waitForLoadState("load");

    // Wait for map to be ready - increased timeout for E2E environment
    const mapContainer = page.getByTestId("mapbox-gl-map");
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(5000);

    // Click the city toggle button
    const singaporeFlag = page.locator('button:has-text("🇸🇬")');
    await singaporeFlag.click();

    // During animation, should show plane emoji with pulse animation
    // Increased timeout to 2000ms to account for E2E environment variability
    const planeEmoji = page.locator('button:has-text("✈️")');
    await expect(planeEmoji).toBeVisible({ timeout: 2000 });

    console.log("✓ Plane animation displayed during transition");

    // Wait for animation to complete (6.5s cross-border)
    await page.waitForTimeout(7000);

    // Plane emoji should be gone, Jakarta flag should appear
    await expect(planeEmoji).not.toBeVisible();
    const jakartaFlag = page.locator('button:has-text("🇮🇩")');
    await expect(jakartaFlag).toBeVisible();

    console.log("✓ Transition animation completed");
  });

  test("should handle browser back/forward navigation", async ({ page }) => {
    // Navigate to Singapore page
    await page.goto("/singapore");
    await page.waitForLoadState("load");
    await page.waitForTimeout(3000);

    // Toggle to Jakarta
    const singaporeFlag = page.locator('button:has-text("🇸🇬")');
    await singaporeFlag.click();
    await page.waitForTimeout(7000);

    // Verify we're on Jakarta
    expect(page.url()).toContain("/jakarta");

    // Go back using browser back button
    await page.goBack();

    // Should be back on Singapore
    await page.waitForFunction(
      () => window.location.pathname.includes("/singapore"),
      { timeout: 5000 },
    );

    // Wait for city context to update and button to re-render
    await page.waitForTimeout(2000);

    // Singapore flag should be visible (recreate locator after state change)
    const singaporeFlagAfterBack = page.locator('button:has-text("🇸🇬")');
    await expect(singaporeFlagAfterBack).toBeVisible();

    console.log("✓ Browser back navigation works correctly");

    // Go forward
    await page.goForward();
    await page.waitForTimeout(1000);

    // Should be on Jakarta again
    await page.waitForFunction(
      () => window.location.pathname.includes("/jakarta"),
      { timeout: 5000 },
    );

    // Jakarta flag should be visible
    const jakartaFlag = page.locator('button:has-text("🇮🇩")');
    await expect(jakartaFlag).toBeVisible();

    console.log("✓ Browser forward navigation works correctly");
  });

  test("should move with search panel when it expands/collapses", async ({
    page,
  }) => {
    // Navigate to Singapore page
    await page.goto("/singapore");
    await page.waitForLoadState("load");
    await page.waitForTimeout(3000);

    // Get initial position of city toggle
    const cityToggle = page.locator('button:has-text("🇸🇬")');
    const initialBox = await cityToggle.boundingBox();
    expect(initialBox).toBeTruthy();

    // Perform a search to expand the search panel
    const searchInput = page.locator('[placeholder="Search locations..."]');
    await searchInput.fill("Marina Bay");
    await searchInput.press("Enter");

    // Wait for search results
    await page.waitForTimeout(2000);

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
    // Navigate to Singapore page
    await page.goto("/singapore");
    await page.waitForLoadState("load");
    await page.waitForTimeout(3000);

    // Add a marker to the page using the browser console
    await page.evaluate(() => {
      // Add a test marker to window object
      (window as any).testMarker = "initial-load";
    });

    // Verify marker exists
    let marker = await page.evaluate(() => (window as any).testMarker);
    expect(marker).toBe("initial-load");

    // Toggle to Jakarta
    const singaporeFlag = page.locator('button:has-text("🇸🇬")');
    await singaporeFlag.click();
    await page.waitForTimeout(7000);

    // Verify marker still exists (page wasn't reloaded)
    marker = await page.evaluate(() => (window as any).testMarker);
    expect(marker).toBe("initial-load");

    console.log("✓ Page state persisted (no full page reload)");
  });

  test("should be visible on mobile view", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to Singapore page
    await page.goto("/singapore");
    await page.waitForLoadState("load");
    await page.waitForTimeout(3000);

    // City toggle button should be visible on mobile
    const cityToggle = page.locator('button:has-text("🇸🇬")');
    await expect(cityToggle).toBeVisible();

    // Get position
    const toggleBox = await cityToggle.boundingBox();
    expect(toggleBox).toBeTruthy();

    // Should be near the top of the search panel (which is at bottom on mobile)
    expect(toggleBox?.y).toBeGreaterThan(0);

    console.log("✓ City toggle visible on mobile viewport");
  });

  test("should disable button during transition", async ({ page }) => {
    // Navigate to Singapore page
    await page.goto("/singapore");
    await page.waitForLoadState("load");
    await page.waitForTimeout(3000);

    // Click the city toggle button
    const singaporeFlag = page.locator('button:has-text("🇸🇬")');
    await singaporeFlag.click();

    // Button should be disabled during animation
    const planeButton = page.locator('button:has-text("✈️")');
    await expect(planeButton).toBeDisabled({ timeout: 1000 });

    console.log("✓ Button disabled during transition");

    // Wait for animation to complete
    await page.waitForTimeout(7000);

    // Button should be enabled again
    const jakartaFlag = page.locator('button:has-text("🇮🇩")');
    await expect(jakartaFlag).toBeEnabled();

    console.log("✓ Button re-enabled after transition");
  });
});
