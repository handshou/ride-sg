import type { Page } from "@playwright/test";

/**
 * Wait for Mapbox map to be fully loaded and ready
 * Uses DOM-based checks for E2E reliability
 */
export async function waitForMapReady(
  page: Page,
  timeout = 30000,
): Promise<void> {
  // Wait for map container to be visible
  const mapContainer = page.getByTestId("mapbox-gl-map");
  await mapContainer.waitFor({ state: "visible", timeout });

  // Wait for Mapbox canvas to be created (indicates map is initializing)
  await page.waitForSelector(".mapboxgl-canvas", {
    state: "attached",
    timeout,
  });

  // Additional buffer for map to fully render tiles and styles
  await page.waitForTimeout(3000);
}

/**
 * Wait for city toggle button to be visible and interactable
 * Uses retry logic for robustness
 */
export async function waitForCityToggleButton(page: Page, timeout = 15000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const button = page.getByTestId("city-toggle-button");
      await button.waitFor({ state: "visible", timeout: 2000 });

      // Extra check that it's actually interactable
      const isVisible = await button.isVisible();
      if (isVisible) {
        return button;
      }
    } catch {
      // Button not ready yet, wait and retry
      await page.waitForTimeout(500);
    }
  }

  throw new Error(
    `City toggle button did not become visible within ${timeout}ms`,
  );
}

/**
 * Wait for URL to contain a specific path
 * More reliable than arbitrary timeouts
 */
export async function waitForUrlPath(
  page: Page,
  path: string,
  timeout = 15000,
): Promise<void> {
  await page.waitForFunction(
    (expectedPath) => window.location.pathname.includes(expectedPath),
    path,
    { timeout },
  );
}

/**
 * Mock geolocation with specific coordinates
 */
export async function mockGeolocation(
  page: Page,
  latitude: number,
  longitude: number,
): Promise<void> {
  await page.evaluate(
    ({ lat, lng }) => {
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: {
            latitude: lat,
            longitude: lng,
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
    },
    { lat: latitude, lng: longitude },
  );
}

/**
 * Mock geolocation to fail with permission denied
 */
export async function mockGeolocationDenied(page: Page): Promise<void> {
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
}

/**
 * Navigate to a city page and wait for it to be fully loaded
 * Includes map readiness check
 */
export async function navigateToCityPage(
  page: Page,
  city: "singapore" | "jakarta",
): Promise<void> {
  await page.goto(`/${city}`);
  // Use "load" instead of "networkidle" - networkidle can timeout with websockets/polling
  await page.waitForLoadState("load");

  // Wait for map container to be visible
  const mapContainer = page.getByTestId("mapbox-gl-map");
  await mapContainer.waitFor({ state: "visible", timeout: 15000 });

  // Wait for map to be fully ready (style loaded, etc.)
  await waitForMapReady(page);
}

/**
 * Click city toggle and select a city from the dropdown
 */
export async function selectCityFromToggle(
  page: Page,
  cityName: "Singapore" | "Jakarta",
): Promise<void> {
  // Wait for and click the toggle button
  const toggleButton = await waitForCityToggleButton(page);
  await toggleButton.click();

  // Wait for dropdown menu and click the city
  const menuItem = page.locator(
    `div[role="menuitem"]:has-text("${cityName}")`,
  );
  await menuItem.waitFor({ state: "visible", timeout: 5000 });
  await menuItem.click();
}
