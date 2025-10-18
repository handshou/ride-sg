import { expect, test } from "@playwright/test";

test.describe("Interactive E2E Testing", () => {
  test("manual interactive test - Singapore Map Explorer", async ({ page }) => {
    // Navigate to the main page
    await page.goto("/");

    // Wait for page to fully load
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Verify interactive map is visible
    const mapContainer = page.getByTestId("mapbox-gl-map");
    await expect(mapContainer).toBeVisible();

    // Verify search panel
    const searchInput = page.getByPlaceholder("Search locations...");
    await expect(searchInput).toBeVisible();

    // Verify map controls
    await expect(page.getByTestId("theme-toggle")).toBeVisible();
    await expect(page.getByTestId("map-style-selector")).toBeVisible();

    // Verify action buttons
    await expect(
      page.getByRole("button", { name: /🎲 Generate Random Coordinates/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /📍 Locate Me/ }),
    ).toBeVisible();

    // Verify coordinates display
    await expect(page.getByText(/Random Location|Your Location/)).toBeVisible();

    console.log("✅ All main elements verified");
    console.log("🎮 Manual interaction guide:");
    console.log("  1. Try the random coordinates button");
    console.log("  2. Try the locate me button");
    console.log("  3. Search for 'garden' or 'marina'");
    console.log("  4. Click on search results to see flyTo animation");
    console.log("  5. Change map style (Light/Dark/Satellite)");
    console.log("  6. Toggle theme (Light/Dark/System)");

    // PAUSE FOR MANUAL INTERACTION
    // This will open a headed browser and pause for you to interact manually
    await page.pause();

    console.log("Interactive test completed");
  });

  test("interactive search and flyTo testing", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Search for locations
    const searchInput = page.getByPlaceholder("Search locations...");
    await searchInput.fill("garden");
    await searchInput.press("Enter");

    // Wait for results
    await page.waitForTimeout(2000);

    console.log("🔍 Search completed");
    console.log("🎮 Try clicking on search results to test flyTo animation:");
    console.log("  - Should see smooth camera movement");
    console.log("  - Should see pitch (tilt) and bearing (rotation)");
    console.log("  - Duration should be ~2.5 seconds");
    console.log("  - Marker should appear at target location");

    // PAUSE FOR MANUAL FLYTO TESTING
    await page.pause();

    console.log("FlyTo testing completed");
  });

  test("mobile responsive testing", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Verify mobile layout
    const mapContainer = page.getByTestId("mapbox-gl-map");
    await expect(mapContainer).toBeVisible();

    // Check that controls are accessible
    await expect(
      page.getByRole("button", { name: /🎲 Generate Random Coordinates/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /📍 Locate Me/ }),
    ).toBeVisible();

    console.log("📱 Mobile testing guide:");
    console.log("  1. Verify search panel is accessible");
    console.log("  2. Verify all buttons are tappable");
    console.log("  3. Try pinch-to-zoom on the map");
    console.log("  4. Test landscape orientation");

    // PAUSE FOR MOBILE TESTING
    await page.pause();

    console.log("Mobile testing completed");
  });
});
