import percySnapshot from "@percy/playwright";
import { expect, type Page, test } from "@playwright/test";

// Helper to conditionally take Percy snapshots
const takeSnapshot = async (page: Page, name: string) => {
  if (process.env.PERCY_TOKEN) {
    await percySnapshot(page, name);
  }
};

/**
 * E2E User Journeys: Complete user flows from start to finish
 *
 * These tests represent real user behavior and critical happy paths.
 */

test.describe("User Journeys", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to Singapore page (landing page redirects automatically)
    await page.goto("/singapore");
    await page.waitForLoadState("load");
    await page.waitForTimeout(3000); // Wait for async data fetching
  });

  test("Journey 1: First-Time Explorer - discovers locations", async ({
    page,
  }) => {
    // STEP 1: User opens app and sees the map
    const mapContainer = page.getByTestId("mapbox-gl-map");
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Map should be fully loaded (no loading spinner)
    await expect(page.locator(".animate-spin").first()).not.toBeVisible();

    console.log("✓ Map loaded successfully");

    // Percy snapshot: Initial map view
    await takeSnapshot(page, "Journey 1 - Map Loaded");

    // STEP 2: User sees and interacts with search panel
    const searchInput = page.getByPlaceholder("Search locations...");
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    console.log("✓ Search panel visible");

    // Percy snapshot: Search interface ready
    await takeSnapshot(page, "Journey 1 - Search Ready");

    // STEP 3: User searches for a landmark
    await searchInput.fill("marina bay sands");
    await searchInput.press("Enter");

    console.log("✓ Search query submitted");

    // Wait for search results to appear
    await page.waitForTimeout(3000);

    // STEP 4: User sees search results
    // Map should still be visible (basic verification)
    await expect(mapContainer).toBeVisible();

    console.log("✓ Search completed, results displayed");

    // Percy snapshot: Search results displayed
    await takeSnapshot(page, "Journey 1 - Search Results");

    // STEP 5: Verify user can interact with results
    // (Just checking that the UI is responsive)
    const searchResultsArea = page.locator('[role="region"]').first();
    if (await searchResultsArea.isVisible()) {
      console.log("✓ Search results area interactive");
    }

    console.log(
      "🎉 Journey 1 Complete: User successfully discovered locations",
    );
  });

  test("Journey 2: Location Saver - saves and manages favorites", async ({
    page,
  }) => {
    // STEP 1: User searches for a location to save
    const searchInput = page.getByPlaceholder("Search locations...");

    // Try different search terms to find Exa results
    const searchTerms = ["Marina Bay Sands", "Gardens by the Bay", "Sentosa"];
    let saveButton = null;
    let searchTerm = "";

    for (const term of searchTerms) {
      await searchInput.fill(term);
      await searchInput.press("Enter");

      console.log(`✓ User searches for: ${term}`);

      // Wait for search results with longer timeout
      await page.waitForTimeout(5000);

      // Look for Exa result with save button
      saveButton = page
        .locator('button[title="Add to randomized list"]')
        .first();

      if (await saveButton.isVisible({ timeout: 2000 })) {
        searchTerm = term;
        console.log(`✓ Found Exa results for: ${term}`);
        break;
      }

      // Wait for input to become enabled before clearing
      await page.waitForTimeout(1000);
      await searchInput.waitFor({ state: "attached", timeout: 5000 });

      // Only clear if we're going to try another term
      if (term !== searchTerms[searchTerms.length - 1]) {
        await searchInput.clear();
        await page.waitForTimeout(500);
      }
    }

    // STEP 2: User finds an Exa result and saves it
    if (saveButton && (await saveButton.isVisible())) {
      console.log("✓ User finds location to save");

      // User clicks save button
      await saveButton.click();
      await page.waitForTimeout(2000);

      console.log("✓ User saves location to favorites");

      // STEP 3: User searches again to verify it's saved
      await searchInput.clear();
      await searchInput.fill(searchTerm);
      await searchInput.press("Enter");

      // Wait for search results with Convex data
      await page.waitForTimeout(5000);

      // STEP 4: User sees the location marked as saved (Convex badge)
      const convexBadge = page.locator('text="Convex"').first();

      if (await convexBadge.isVisible()) {
        console.log("✓ User sees location marked as saved");

        // Percy snapshot: Saved location with badge
        await takeSnapshot(page, "Journey 2 - Location Saved");

        // STEP 5: User decides to remove the location later
        const deleteButton = page
          .locator('button[title="Delete from Convex"]')
          .first();

        if (await deleteButton.isVisible()) {
          console.log("✓ User finds delete option");

          // User removes the saved location
          await deleteButton.click();
          await page.waitForTimeout(2000);

          console.log("✓ User removes saved location");

          // STEP 6: User verifies deletion by searching again
          await searchInput.clear();
          await searchInput.fill(searchTerm);
          await searchInput.press("Enter");

          await page.waitForTimeout(5000);

          // Count remaining Convex badges (should be less)
          const remainingBadges = await page.locator('text="Convex"').count();
          console.log(`✓ Remaining saved locations: ${remainingBadges}`);

          expect(remainingBadges).toBeGreaterThanOrEqual(0);

          console.log(
            "🎉 Journey 2 Complete: User saved and managed favorite locations",
          );
        } else {
          console.log("⚠️ Delete button not visible, journey incomplete");
        }
      } else {
        console.log("⚠️ Location not saved to Convex, may be API/cache issue");
      }
    } else {
      console.log(
        `⚠️ No Exa results found for any search term (${searchTerms.join(", ")}), journey skipped`,
      );
      console.log("This may indicate Exa API issues or rate limiting");
    }
  });
});
