import { expect, test } from "@playwright/test";

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
    // Navigate directly to Singapore page
    await page.goto("/singapore");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Mock geolocation to return Singapore coordinates
    await page.evaluate(() => {
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: {
            latitude: 1.3521,
            longitude: 103.8198,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: Date.now(),
          toJSON: () => ({}),
        });
      };
    });

    // Click "Locate Me" button
    const locateButton = page.getByTestId("locate-me-button");
    await locateButton.click();

    // Wait for animation (1.8s local flyTo)
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

    // Navigate directly to Singapore page
    await page.goto("/singapore");
    await page.waitForLoadState("networkidle");

    // Wait for map to be ready (mapbox container should be visible)
    const mapContainer = page.getByTestId("mapbox-gl-map");
    await expect(mapContainer).toBeVisible({ timeout: 10000 });

    // Additional wait to ensure map is fully loaded and style is ready
    // In E2E tests, map.isStyleLoaded() may take longer than expected
    await page.waitForTimeout(8000);

    // Mock geolocation to return Jakarta coordinates
    await page.evaluate(() => {
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: {
            latitude: -6.2088,
            longitude: 106.8456,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: Date.now(),
          toJSON: () => ({}),
        });
      };
    });

    // Click "Locate Me" button
    const locateButton = page.getByTestId("locate-me-button");
    await locateButton.click();

    console.log("✓ Cross-border flyTo animation started");

    // Wait for URL to change to /jakarta
    // Uses waitForFunction since we're using history.replaceState (no navigation event)
    await page.waitForFunction(
      () => window.location.pathname.includes("/jakarta"),
      { timeout: 15000 },
    );

    console.log("✓ URL updated to /jakarta after animation");

    // Map should still be visible (no full page reload)
    await expect(mapContainer).toBeVisible();

    console.log("✓ Map still visible (no page reload)");
  });

  test("should navigate to Singapore page when location is in Singapore (from Jakarta)", async ({
    page,
  }) => {
    // Navigate directly to Jakarta page
    await page.goto("/jakarta");
    await page.waitForLoadState("networkidle");

    // Wait for map to be ready (mapbox container should be visible)
    const mapContainer = page.getByTestId("mapbox-gl-map");
    await expect(mapContainer).toBeVisible({ timeout: 10000 });

    // Additional wait to ensure map is fully loaded and style is ready
    // In E2E tests, map.isStyleLoaded() may take longer than expected
    await page.waitForTimeout(8000);

    // Mock geolocation to return Singapore coordinates
    await page.evaluate(() => {
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: {
            latitude: 1.3521,
            longitude: 103.8198,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: Date.now(),
          toJSON: () => ({}),
        });
      };
    });

    // Click "Locate Me" button
    const locateButton = page.getByTestId("locate-me-button");
    await locateButton.click();

    console.log("✓ Cross-border flyTo animation started");

    // Wait for URL to change to /singapore
    // Uses waitForFunction since we're using history.replaceState (no navigation event)
    await page.waitForFunction(
      () => window.location.pathname.includes("/singapore"),
      { timeout: 15000 },
    );

    console.log("✓ URL updated to /singapore after animation");

    // Map should still be visible (no full page reload)
    await expect(mapContainer).toBeVisible();

    console.log("✓ Map still visible (no page reload)");
  });

  test("should handle geolocation permission denied gracefully", async ({
    page,
  }) => {
    // Navigate directly to Singapore page
    await page.goto("/singapore");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Mock geolocation to fail with permission denied
    await page.evaluate(() => {
      navigator.geolocation.getCurrentPosition = (_success, error) => {
        if (error) {
          error({
            code: 1, // PERMISSION_DENIED
            message: "User denied Geolocation",
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          });
        }
      };
    });

    // Click "Locate Me" button
    const locateButton = page.getByTestId("locate-me-button");
    await locateButton.click();

    // Wait for error handling
    await page.waitForTimeout(2000);

    // Should show error toast with the actual message
    const errorToast = page.locator(
      'text="Location access denied. Please enable location permissions."',
    );
    await expect(errorToast).toBeVisible({ timeout: 5000 });

    console.log("✓ Error toast displayed for permission denied");
  });

  test("should handle unknown location gracefully", async ({ page }) => {
    // Navigate directly to Singapore page
    await page.goto("/singapore");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Mock geolocation to return coordinates outside Singapore/Jakarta
    await page.evaluate(() => {
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: {
            latitude: 0, // Somewhere in the ocean
            longitude: 0,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: Date.now(),
          toJSON: () => ({}),
        });
      };
    });

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
