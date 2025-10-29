import { expect, test } from "@playwright/test";
import {
  mockGeolocation,
  mockGeolocationDenied,
  navigateToCityPage,
  waitForUrlPath,
} from "./helpers";

/**
 * Cross-Border Navigation E2E Tests
 *
 * Tests the intelligent cross-border navigation feature:
 * - City detection from coordinates
 * - Smooth flyTo animations
 * - URL updates without page reloads
 */

test.describe("Cross-Border Navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Mock Mapbox Geocoding API for city detection
    await page.route(
      "**/api.mapbox.com/geocoding/v5/mapbox.places/**",
      async (route) => {
        const url = route.request().url();

        // Extract coordinates from URL
        const coordsMatch = url.match(
          /mapbox\.places\/([\d.-]+),([\d.-]+)\.json/,
        );
        if (!coordsMatch) {
          return route.continue();
        }

        const longitude = Number.parseFloat(coordsMatch[1]);
        const latitude = Number.parseFloat(coordsMatch[2]);

        // Mock Singapore location
        if (
          latitude >= 1.16 &&
          latitude <= 1.47 &&
          longitude >= 103.6 &&
          longitude <= 104.0
        ) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              type: "FeatureCollection",
              features: [
                {
                  id: "country.1",
                  type: "Feature",
                  place_type: ["country"],
                  properties: {
                    short_code: "sg",
                  },
                  text: "Singapore",
                  place_name: "Singapore",
                  center: [longitude, latitude],
                },
              ],
            }),
          });
        }

        // Mock Jakarta location
        if (
          latitude >= -6.4 &&
          latitude <= -6.1 &&
          longitude >= 106.68 &&
          longitude <= 107.0
        ) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              type: "FeatureCollection",
              features: [
                {
                  id: "place.1",
                  type: "Feature",
                  place_type: ["place"],
                  properties: {},
                  text: "Jakarta",
                  place_name: "Jakarta, Indonesia",
                  center: [longitude, latitude],
                },
              ],
            }),
          });
        }

        // Unknown location
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            type: "FeatureCollection",
            features: [],
          }),
        });
      },
    );

    // Note: Tests navigate directly to city pages since landing page redirects to /singapore
  });

  test("should stay on same page for local navigation (Singapore)", async ({
    page,
  }) => {
    // Navigate to Singapore page and wait for map ready
    await navigateToCityPage(page, "singapore");

    // Mock geolocation to return Singapore coordinates
    await mockGeolocation(page, 1.3521, 103.8198);

    // Click "Locate Me" button
    const locateButton = page.getByTestId("locate-me-button");
    await locateButton.click();

    // Wait for animation to complete - should stay on Singapore
    await page.waitForTimeout(2500);

    // Should still be on /singapore
    expect(page.url()).toContain("/singapore");

    console.log("✓ Local navigation (Singapore) - No page change");
  });

  test("should navigate to Jakarta page when location is in Jakarta", async ({
    page,
  }) => {
    // Listen to console messages for debugging
    page.on("console", (msg) => {
      if (
        msg.type() === "error" ||
        msg.text().includes("Cross-border") ||
        msg.text().includes("City detection")
      ) {
        console.log(`Browser console [${msg.type()}]:`, msg.text());
      }
    });

    // Navigate to Singapore page and wait for map ready
    await navigateToCityPage(page, "singapore");
    const mapContainer = page.getByTestId("mapbox-gl-map");

    // Mock geolocation to return Jakarta coordinates
    await mockGeolocation(page, -6.2088, 106.8456);

    // Click "Locate Me" button
    const locateButton = page.getByTestId("locate-me-button");
    await locateButton.click();

    console.log("✓ Cross-border flyTo animation started");

    // Wait for URL to change to /jakarta
    await waitForUrlPath(page, "/jakarta", 20000);

    console.log("✓ URL updated to /jakarta after animation");

    // Map should still be visible (no full page reload)
    await expect(mapContainer).toBeVisible();

    console.log("✓ Map still visible (no page reload)");
  });

  test("should navigate to Singapore page when location is in Singapore (from Jakarta)", async ({
    page,
  }) => {
    // Navigate to Jakarta page and wait for map ready
    await navigateToCityPage(page, "jakarta");
    const mapContainer = page.getByTestId("mapbox-gl-map");

    // Mock geolocation to return Singapore coordinates
    await mockGeolocation(page, 1.3521, 103.8198);

    // Click "Locate Me" button
    const locateButton = page.getByTestId("locate-me-button");
    await locateButton.click();

    console.log("✓ Cross-border flyTo animation started");

    // Wait for URL to change to /singapore
    await waitForUrlPath(page, "/singapore", 20000);

    console.log("✓ URL updated to /singapore after animation");

    // Map should still be visible (no full page reload)
    await expect(mapContainer).toBeVisible();

    console.log("✓ Map still visible (no page reload)");
  });

  test("should handle geolocation permission denied gracefully", async ({
    page,
  }) => {
    // Navigate to Singapore page and wait for map ready
    await navigateToCityPage(page, "singapore");

    // Mock geolocation to fail with permission denied
    await mockGeolocationDenied(page);

    // Click "Locate Me" button
    const locateButton = page.getByTestId("locate-me-button");
    await locateButton.click();

    // Should show error toast with the actual message
    const errorToast = page.locator(
      'text="Location access denied. Please enable location permissions."',
    );
    await expect(errorToast).toBeVisible({ timeout: 5000 });

    console.log("✓ Error toast displayed for permission denied");
  });

  test("should handle unknown location gracefully", async ({ page }) => {
    // Navigate to Singapore page and wait for map ready
    await navigateToCityPage(page, "singapore");

    // Mock geolocation to return coordinates outside Singapore/Jakarta
    await mockGeolocation(page, 0, 0);

    // Click "Locate Me" button
    const locateButton = page.getByTestId("locate-me-button");
    await locateButton.click();

    // Wait for local flyTo animation (unknown is treated as local)
    await page.waitForTimeout(2500);

    // Should stay on /singapore (unknown location doesn't trigger cross-border)
    expect(page.url()).toContain("/singapore");

    console.log("✓ Unknown location handled - stayed on current page");
  });
});
