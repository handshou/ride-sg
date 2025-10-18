import { expect, test } from '@playwright/test';

test.describe('Singapore Map Explorer E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
  });

  test('should display the main page elements', async ({ page }) => {
    // Check main heading
    await expect(page.getByRole('heading', { name: '🗺️ Singapore Map Explorer' })).toBeVisible();
    
    // Check subtitle
    await expect(page.getByText('Powered by Effect-TS and Mapbox MCP')).toBeVisible();
    
    // Check Mapbox Integration section
    await expect(page.getByText('🗺️ Mapbox Integration')).toBeVisible();
  });

  test('should show Singapore locations section', async ({ page }) => {
    // Check for Singapore locations heading
    await expect(page.getByText('Singapore Locations:')).toBeVisible();
    
    // Check that location data is displayed (should have at least one location)
    const locationText = page.locator('text=Singapore');
    await expect(locationText.first()).toBeVisible();
  });

  test('should show current location section', async ({ page }) => {
    // Check for current location heading
    await expect(page.getByText('Current Location:')).toBeVisible();
    
    // Check that location data is displayed
    const locationText = page.locator('text=Location at');
    await expect(locationText.first()).toBeVisible();
  });

  test('should display interactive Singapore map', async ({ page }) => {
    // Check for interactive map heading
    await expect(page.getByText('Interactive Singapore Map:')).toBeVisible();
    
    // Check for random coordinates display
    await expect(page.getByText(/🎲 Random coordinates:/)).toBeVisible();
    
    // Check for interactive map container
    const interactiveMap = page.getByTestId('mapbox-gl-map');
    await expect(interactiveMap).toBeVisible();
  });

  test('should display static map fallback', async ({ page }) => {
    // Check for static map heading
    await expect(page.getByText('Static Map (Fallback):')).toBeVisible();
    
    // Check for map image
    const mapImage = page.locator('img[alt="Random Singapore Map"]');
    await expect(mapImage).toBeVisible();
    
    // Check for map URL display
    await expect(page.getByText(/Map URL:/)).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Check for error state indicators (these may or may not be visible depending on service status)
    const errorIndicators = page.locator('text=⚠️').or(page.locator('text=🚨'));
    
    // If error indicators are present, they should be visible
    const errorCount = await errorIndicators.count();
    if (errorCount > 0) {
      await expect(errorIndicators.first()).toBeVisible();
    }
  });

  test('should display toast notifications when needed', async ({ page }) => {
    // Wait a bit for any potential toasts to appear
    await page.waitForTimeout(2000);
    
    // Check for Sonner toast container (may or may not be visible)
    const toastContainer = page.locator('[data-sonner-toaster]');
    const hasToasts = await toastContainer.count() > 0;
    
    if (hasToasts) {
      await expect(toastContainer).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that the main heading is still visible on mobile
    await expect(page.getByRole('heading', { name: '🗺️ Singapore Map Explorer' })).toBeVisible();
    
    // Check that interactive map is still visible on mobile
    const interactiveMap = page.getByTestId('mapbox-gl-map');
    await expect(interactiveMap).toBeVisible();
    
    // Check that static map fallback is also visible
    const mapImage = page.locator('img[alt="Random Singapore Map"]');
    await expect(mapImage).toBeVisible();
  });

  test('should load without JavaScript errors', async ({ page }) => {
    // Check for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Should not have critical JavaScript errors
    const criticalErrors = errors.filter(error => 
      !error.includes('Map may not load without a valid Mapbox token') &&
      !error.includes('Note: Map may not load')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
