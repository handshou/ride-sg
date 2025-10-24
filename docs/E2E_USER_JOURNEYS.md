# E2E User Journeys - Analysis & Refactoring Plan

## 🎯 App Features (From README)

1. **Smart Landmark Search** - AI-powered search with Exa API, Convex caching
2. **Interactive Map Explorer** - Map styles, 3D buildings, flyTo animations
3. **Real-time Bicycle Parking** - LTA DataMall data, save favorites
4. **Real-time Rainfall Overlay** - Heat map visualization
5. **Location Discovery** - GPS, random coords, saved locations
6. **Theme Support** - Dark/light mode

---

## 📊 Current Test Coverage Analysis

### File: `toast-notifications.spec.ts` (3 tests)

| Test | What it Tests | User Journey? | Keep/Consolidate/Remove |
|------|--------------|---------------|-------------------------|
| 1. "should load and display the map" | Map renders, no spinner | ✅ Part of journey | **Consolidate** - This is the starting point |
| 2. "should display search panel and allow search" | Search input exists, search executes | ✅ Part of journey | **Consolidate** - Core user action |
| 3. "should not have critical JavaScript errors" | No console errors | ❌ Technical check | **Keep separate** - Smoke test |

### File: `convex-operations.spec.ts` (3 tests)

| Test | What it Tests | User Journey? | Keep/Consolidate/Remove |
|------|--------------|---------------|-------------------------|
| 1. "should save and delete a search result from Convex" | Full CRUD cycle | ✅ Complete journey | **This IS a journey!** Keep as-is |
| 2. "should not show delete button for non-database results" | UI state validation | ❌ Edge case check | **Remove** - Too granular |
| 3. "should handle delete errors gracefully" | Error handling | ❌ Edge case | **Remove** - Not user-facing |

---

## 🚶 Identified Real User Journeys

Based on app features and actual user behavior:

### Journey 1: **First-Time Explorer** (Primary Happy Path)
**User Goal:** "I want to discover interesting places in Singapore"

**Steps:**
1. Opens app → Map loads with Singapore view
2. Sees UI controls (search, map styles, etc.)
3. Searches for "Marina Bay Sands"
4. Clicks on search result
5. Map flies to location with marker
6. Explores other map features (3D buildings, rainfall)

**Current Coverage:** Partially covered by `toast-notifications` tests

---

### Journey 2: **Location Saver** (Power User)
**User Goal:** "I want to save my favorite places for quick access"

**Steps:**
1. Searches for a place
2. Clicks save button on search result
3. Sees success toast
4. Searches again → sees location marked as "saved" (Convex badge)
5. Later: Cycles through saved locations with "Next Saved Location" button
6. Deletes a saved location when no longer needed

**Current Coverage:** ✅ **Fully covered** by "should save and delete a search result from Convex"

---

### Journey 3: **Cyclist Planning Route** (Feature-Specific)
**User Goal:** "I want to find bicycle parking near my destination"

**Steps:**
1. Searches for destination
2. Toggles bicycle parking overlay
3. Sees parking markers on map
4. Clicks on parking marker → sees details (shelter, racks)
5. Plans route based on parking availability

**Current Coverage:** ❌ **Not tested at all**

---

### Journey 4: **Weather-Aware Traveler** (Feature-Specific)
**User Goal:** "I want to avoid rain during my journey"

**Steps:**
1. Opens app
2. Sees rainfall overlay (enabled by default?)
3. Checks rain intensity in target area
4. Decides on timing based on rain forecast

**Current Coverage:** ❌ **Not tested at all**

---

### Journey 5: **Location Discovery** (Feature Usage)
**User Goal:** "I want to explore random places or find my current location"

**Steps:**
1. Clicks "Locate Me" → Map flies to GPS location
2. OR clicks "Random Coordinates" → Discovers new area
3. Searches nearby for interesting places

**Current Coverage:** ❌ **Not tested at all**

---

## 🎨 Percy Visual Testing Coverage

### Current Snapshots (4 total):
1. ✅ "Map Loaded" - Initial state
2. ✅ "Search Panel Ready" - Search UI
3. ✅ "Search Results" - After search
4. ✅ "Convex Badge Displayed" - Saved location indicator

### Missing Visual Coverage:
- ❌ Bicycle parking overlay
- ❌ Rainfall heat map
- ❌ 3D buildings view
- ❌ Different map styles (satellite, dark)
- ❌ Dark/light theme comparison
- ❌ Mobile responsive views

---

## 🔧 Recommended E2E Test Structure

### Core E2E Tests (User Journeys)

```
tests/e2e/
├── user-journeys.spec.ts          # Main happy paths
│   ├── Journey 1: First-Time Explorer (map + search + fly)
│   └── Journey 2: Location Saver (search + save + delete)
│
├── feature-journeys.spec.ts       # Feature-specific flows
│   ├── Journey 3: Cyclist (bicycle parking)
│   ├── Journey 4: Weather Check (rainfall)
│   └── Journey 5: Location Discovery (GPS + random)
│
└── smoke-tests.spec.ts            # Quick health checks
    ├── No critical JS errors
    ├── Map loads in all browsers
    └── Search API responds
```

### Integration Tests (Move to separate folder)

```
tests/integration/
├── convex-ui-states.spec.ts       # UI state validations
├── error-handling.spec.ts         # Error recovery
└── api-fallbacks.spec.ts          # Exa/Convex fallbacks
```

---

## 📋 Proposed Changes

### ✅ Keep As-Is
1. **"should save and delete a search result from Convex"** 
   - This IS Journey 2 (Location Saver)
   - Already a complete user flow
   - Just needs better naming

### 🔄 Consolidate Into New Tests
2. **"should load and display the map"** + **"should display search panel and allow search"**
   → Merge into Journey 1: "First-Time Explorer"
   
### 🗑️ Remove (Move to Integration Tests)
3. **"should not show delete button for non-database results"**
   - Too granular for E2E
   - This is UI state validation
   - Move to integration tests

4. **"should handle delete errors gracefully"**
   - Edge case testing
   - Not critical for E2E
   - Move to integration tests

### ➕ Add New Tests
5. **Journey 3: Cyclist Planning Route** (bicycle parking)
6. **Journey 4: Weather-Aware Traveler** (rainfall)
7. **Journey 5: Location Discovery** (GPS + random)

### 🎨 Add Percy Snapshots
8. Bicycle parking overlay view
9. Rainfall heat map view
10. 3D buildings enabled
11. Dark theme comparison

---

## 💡 Next Steps

### Phase 1: Refactor Existing (Quick Win)
1. Rename "should save and delete..." → "User saves and manages favorite locations"
2. Consolidate map + search tests into "User discovers locations"
3. Move granular tests to `tests/integration/`

### Phase 2: Add Feature Journeys (High Value)
4. Add bicycle parking journey test
5. Add rainfall overlay journey test
6. Add location discovery journey test

### Phase 3: Enhance Visual Testing (Percy)
7. Add feature-specific Percy snapshots
8. Add theme comparison snapshots

---

## 🎯 Success Metrics

**Before:**
- ❌ 6 tests that are really integration tests
- ❌ No complete user journeys
- ❌ Missing feature coverage (bicycle, rainfall, location discovery)

**After:**
- ✅ 2-3 core user journey tests (happy paths)
- ✅ 3-4 feature-specific journey tests
- ✅ 1 smoke test for health checks
- ✅ Comprehensive Percy visual coverage
- ✅ Clear separation: E2E (journeys) vs Integration (technical checks)

---

## 🤔 Questions for Review

1. **Which journeys are most critical?**
   - Journey 1 (First-Time Explorer) - YES, critical onboarding
   - Journey 2 (Location Saver) - YES, core feature
   - Journey 3 (Cyclist) - Depends on user base
   - Journey 4 (Weather) - Depends on usage
   - Journey 5 (Location Discovery) - Nice to have

2. **Do we need to test all map features?**
   - 3D buildings toggle - YES, visual regression prone
   - Map style switching - MAYBE, could be integration test
   - Theme switching - YES, affects everything

3. **How many browsers for E2E?**
   - Currently testing 3 browsers (Chromium, Firefox, WebKit)
   - Could reduce to just Chromium for speed? (18 tests → 6 tests)
   - Or keep all 3 for critical journeys only?

4. **Percy snapshot strategy?**
   - One snapshot per journey (current: 4 snapshots)
   - Or multiple per journey to catch intermediate states?
   - Balance: coverage vs. monthly snapshot limit (5000)

---

## 📝 Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Keep Convex save/delete test? | ✅ YES | Already a complete user journey |
| Consolidate map + search tests? | ✅ YES | Should be one journey |
| Remove granular UI checks? | ✅ YES | Move to integration tests |
| Test bicycle parking? | 🤔 TBD | User decides based on priority |
| Test rainfall overlay? | 🤔 TBD | User decides based on priority |
| Reduce to 1 browser? | 🤔 TBD | User decides: speed vs. coverage |

---

Ready to review these user journeys and decide which ones to implement! 🚀

