import { expect, test } from '@playwright/test';

test.describe('Interactive E2E Testing', () => {
  test('manual interactive test - Singapore Map Explorer', async ({ page }) => {
    // Navigate to the main page
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Verify main page elements are visible
    await expect(page.getByRole('heading', { name: '🗺️ Singapore Map Explorer' })).toBeVisible();
    await expect(page.getByText('Powered by Effect-TS and Mapbox MCP')).toBeVisible();
    
    // Check Mapbox Integration section
    await expect(page.getByText('🗺️ Mapbox Integration')).toBeVisible();
    
    // Verify Singapore locations section
    await expect(page.getByText('Singapore Locations:')).toBeVisible();
    const singaporeLocation = page.locator('text=Singapore').first();
    await expect(singaporeLocation).toBeVisible();
    
    // Verify current location section
    await expect(page.getByText('Current Location:')).toBeVisible();
    const currentLocation = page.locator('text=Location at').first();
    await expect(currentLocation).toBeVisible();
    
    // Verify interactive map section
    await expect(page.getByText('Interactive Singapore Map:')).toBeVisible();
    await expect(page.getByText(/🎲 Random coordinates:/)).toBeVisible();
    
    // Check interactive map container
    const interactiveMap = page.getByTestId('mapbox-gl-map');
    await expect(interactiveMap).toBeVisible();
    
    // Verify static map fallback section
    await expect(page.getByText('Static Map (Fallback):')).toBeVisible();
    
    // Check static map image
    const mapImage = page.locator('img[alt="Random Singapore Map"]');
    await expect(mapImage).toBeVisible();
    
    // Check map URL display
    await expect(page.getByText(/Map URL:/)).toBeVisible();
    
    // PAUSE FOR MANUAL INTERACTION
    // This will open a headed browser and pause for you to interact manually
    await page.pause();
    
    // After you close the browser or continue, these assertions will run
    console.log('Interactive test completed - you can now interact with the page manually');
  });

  test('interactive toast testing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for any error indicators that might trigger toasts
    const errorIndicators = page.locator('text=⚠️').or(page.locator('text=🚨'));
    const errorCount = await errorIndicators.count();
    
    if (errorCount > 0) {
      console.log(`Found ${errorCount} error indicators - these should trigger toasts`);
      await expect(errorIndicators.first()).toBeVisible();
    }
    
    // Check for Sonner toast container
    const toastContainer = page.locator('[data-sonner-toaster]');
    const hasToasts = await toastContainer.count() > 0;
    
    if (hasToasts) {
      console.log('Toast notifications are present');
      await expect(toastContainer).toBeVisible();
    }
    
    // PAUSE FOR MANUAL TOAST TESTING
    await page.pause();
    
    console.log('Toast testing completed - check for toast notifications manually');
  });

  test('mobile responsive testing', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify mobile layout
    await expect(page.getByRole('heading', { name: '🗺️ Singapore Map Explorer' })).toBeVisible();
    
    // Check interactive map is still visible on mobile
    const interactiveMap = page.getByTestId('mapbox-gl-map');
    await expect(interactiveMap).toBeVisible();
    
    // Check static map fallback is also visible
    const mapImage = page.locator('img[alt="Random Singapore Map"]');
    await expect(mapImage).toBeVisible();
    
    // PAUSE FOR MOBILE TESTING
    await page.pause();
    
    console.log('Mobile testing completed - verify responsive design manually');
  });
});
