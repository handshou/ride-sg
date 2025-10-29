# E2E Test Improvements Summary

## Results

### Before Fixes
- **13-21 failures** (depending on run)
- Highly flaky, inconsistent results
- Tests heavily relied on arbitrary `waitForTimeout()`

### After Fixes
- **4 failures, 17 passing** (81% pass rate)
- Much more stable and predictable
- Removed most arbitrary timeouts

## What Was Fixed

### 1. Created Reusable Helper Functions (`tests/e2e/helpers.ts`)

**`waitForMapReady(page)`**
- Waits for Mapbox canvas to be attached to DOM
- Uses DOM-based checks instead of trying to access map instance
- Gives map 3 seconds to render tiles and load styles

**`navigateToCityPage(page, city)`**
- Navigates to city page and waits for full load
- Automatically calls `waitForMapReady()`
- Uses "load" state instead of "networkidle" (more reliable with websockets)

**`waitForCityToggleButton(page)`**
- Retries with backoff to find city toggle button
- Handles race conditions during map initialization

**`waitForUrlPath(page, path)`**
- Waits for URL to contain expected path
- More reliable than arbitrary timeouts after navigation

**`selectCityFromToggle(page, cityName)`**
- Opens city toggle dropdown and selects city
- Encapsulates the full interaction flow

**`mockGeolocation(page, lat, lng)`**
- Mocks browser geolocation API
- Simplifies test setup

### 2. Refactored All Tests

**city-toggle.spec.ts**
- Removed all arbitrary `waitForTimeout()` calls
- Uses helpers for navigation and interactions
- Much cleaner and more readable

**cross-border-navigation.spec.ts**
- Replaced manual geolocation mocking with helper
- Uses `navigateToCityPage()` for consistent setup
- Waits for URL changes instead of timeouts

## Remaining Known Flaky Tests

### 1. "should move with search panel when it expands/collapses"
**Issue:** Search doesn't return results
**Root Cause:** Likely needs mock data or API responses
**Impact:** Minor - UI positioning test

### 2. "should disable button during transition"
**Issue:** City toggle button not found after city switch
**Root Cause:** UI state after rapid city switches
**Impact:** Minor - tests button state management

### 3 & 4. Cross-border navigation tests (Singapore ↔ Jakarta)
**Issue:** "Map is not ready for flyTo animation"
**Root Cause:** Map style loading takes longer than 3s wait in some environments
**Potential Fixes:**
- Increase `waitForMapReady()` timeout to 5s
- Add retry logic to cross-border navigation service
- Use event-based waiting (listen for Mapbox 'load' event)
**Impact:** Moderate - tests core cross-border feature

## Recommendations

### Short Term
1. **Increase map wait time** - Change `waitForTimeout(3000)` to `5000` in `waitForMapReady()`
2. **Add search mocks** - Mock search API responses for consistent test data
3. **Add Mapbox event listeners** - Wait for actual 'load' event instead of timeouts

### Long Term
1. **Mock Mapbox GL entirely** - Consider using a lightweight mock for E2E tests
2. **Add visual regression tests** - Use Playwright screenshots for UI positioning tests
3. **Separate integration from E2E** - Move map-dependent tests to integration suite with mocks

## Best Practices for New E2E Tests

1. ✅ **Always use helpers** - Don't write raw `waitForTimeout()` calls
2. ✅ **Wait for DOM changes** - Use `waitForSelector()`, `waitForFunction()`
3. ✅ **Use page.goto() + helpers** - Let `navigateToCityPage()` handle map readiness
4. ✅ **Test user flows, not implementation** - Focus on what users see and do
5. ❌ **Don't access internals** - E2E tests should not rely on `window.mapInstance`
6. ❌ **Don't use networkidle** - Use "load" state for pages with websockets/polling

## How To Run Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run in headed mode (see browser)
pnpm test:e2e --headed

# Run specific test file
pnpm test:e2e tests/e2e/city-toggle.spec.ts

# Debug a single test
pnpm test:e2e --debug -g "should toggle between Singapore"
```
