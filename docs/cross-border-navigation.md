# Cross-Border Navigation System

## Overview

The ride-sg application supports seamless navigation between Singapore and Jakarta, with intelligent city detection, filtered location data, and smooth cross-border transitions.

## Architecture

### 1. City-Based Data Segregation

All saved locations are tagged with a city field and filtered by the current page:

```typescript
// Schema (convex/schema.ts)
locations: defineTable({
  title: v.string(),
  description: v.string(),
  latitude: v.number(),
  longitude: v.number(),
  source: v.union(v.literal("mapbox"), v.literal("exa"), v.literal("database")),
  timestamp: v.number(),
  city: v.union(v.literal("singapore"), v.literal("jakarta")), // City location
  isRandomizable: v.optional(v.boolean()),
  postalCode: v.optional(v.string()),
})
  .index("by_timestamp", ["timestamp"])
  .index("by_source", ["source"])
  .index("by_city", ["city"])
  .index("by_city_randomizable", ["city", "isRandomizable"])
```

### 2. Automatic City Detection

When saving locations, the system automatically detects the city using Mapbox reverse geocoding:

```typescript
// src/lib/utils/detect-location.ts
export async function detectCityFromCoords(
  latitude: number,
  longitude: number,
  mapboxToken: string,
): Promise<DetectedCity> {
  // Uses Mapbox Geocoding API to determine:
  // - Singapore: lat 1.16-1.47, lng 103.6-104.0
  // - Jakarta: lat -6.4 to -6.1, lng 106.68-107.0
  // - Unknown: anything else
}
```

### 3. Cross-Border Navigation Logic

#### FlyTo Duration Strategy

The system uses different animation durations based on whether navigation is local or cross-border:

| Scenario | Duration | Curve | Detection Logic |
|----------|----------|-------|----------------|
| Singapore → Singapore | 2.5s | 1.6 | Same city (local) |
| Singapore → Jakarta | 6.5s | 1.8 | Cross-border |
| Jakarta → Singapore | 6.5s | 1.8 | Cross-border |
| Jakarta → Jakarta | 2.5s | 1.6 | Same city (local) |
| Any → Unknown | 2.5s | 1.6 | Treated as local |

#### Implementation

```typescript
// src/lib/services/cross-border-navigation-service.ts:188-190
const isCrossBorder =
  (currentCity === "singapore" && detectedCity === "jakarta") ||
  (currentCity === "jakarta" && detectedCity === "singapore");
```

## User Features

### 1. Default Landing Page

- **Route:** `/` (root)
- **Behavior:** Automatically redirects to `/singapore`
- **Why:** Provides a consistent starting point while still supporting GPS-based city switching

```typescript
// src/app/page.tsx
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/singapore"); // Default to Singapore
  }, [router]);
}
```

### 2. City Toggle Button

Located in the **bottom right corner** of each map page, displays the opposite city's flag:

- **Singapore page:** Shows 🇮🇩 (Indonesia flag)
- **Jakarta page:** Shows 🇸🇬 (Singapore flag)

#### Toggle Behavior

When clicked:
1. **Flies to target city center** with 3.5s dramatic animation
2. **Updates URL** using `router.push()` (adds to browser history)
3. **Shows airplane emoji** (✈️) during transition
4. **Loads city-specific data** (filtered locations, parking, etc.)

```typescript
// src/components/city-toggle-button.tsx
const CITY_CENTERS = {
  singapore: { latitude: 1.3521, longitude: 103.8198, zoom: 12 },
  jakarta: { latitude: -6.2088, longitude: 106.8456, zoom: 12 },
};

const CITY_FLAGS = {
  singapore: "🇸🇬",
  jakarta: "🇮🇩",
};
```

### 3. GPS-Based City Switching

When a user clicks "Locate Me":
1. Gets device GPS coordinates
2. Detects city using Mapbox reverse geocoding
3. If **cross-border detected**:
   - Flies to location with 6.5s animation
   - Updates URL to correct city page
   - Shows cross-border detected toast
4. If **same city**:
   - Flies to location with 2.5s animation
   - Stays on current page

```typescript
// src/components/singapore-map-explorer.tsx:567-578
const result = await runClientEffectAsync(
  Effect.gen(function* () {
    const service = yield* CrossBorderNavigationServiceTag;
    return yield* service.handleLocationFound({
      coordinates: coords,
      currentCity: "singapore",
      map: mapInstance,
      mapboxToken: mapboxPublicToken,
      isMobile,
    });
  }),
);
```

### 4. Search Result Navigation

When selecting a search result (saved location or search query):
1. Detects city from result coordinates
2. Determines if cross-border
3. Flies to location with appropriate animation
4. Updates URL if needed

## Data Flow

### Saving Locations

```
User saves location
    ↓
Detect city from coordinates (Mapbox API)
    ↓
Save to Convex with city field
    ↓
Reactive query updates UI (only shows locations for current city)
```

### Querying Locations

```typescript
// Singapore page
const convexLocations = useQuery(api.locations.getRandomizableLocations, {
  city: "singapore", // Only Singapore locations
});

// Jakarta page
const convexLocations = useQuery(api.locations.getRandomizableLocations, {
  city: "jakarta", // Only Jakarta locations
});
```

### Cross-Border Detection Flow

```
User triggers navigation (GPS, search, random)
    ↓
Get coordinates
    ↓
Detect city via Mapbox reverse geocoding
    ↓
Compare detectedCity with currentCity
    ↓
If different → Cross-border (6.5s animation + URL update)
If same → Local (2.5s animation)
```

## API Endpoints

### Convex Queries

#### `api.locations.getRandomizableLocations`
```typescript
args: {
  city: v.optional(v.union(v.literal("singapore"), v.literal("jakarta"))),
}
```

#### `api.locations.searchLocations`
```typescript
args: {
  query: v.string(),
  city: v.optional(v.union(v.literal("singapore"), v.literal("jakarta"))),
}
```

#### `api.locations.getAllLocations`
```typescript
args: {
  city: v.optional(v.union(v.literal("singapore"), v.literal("jakarta"))),
}
```

### Convex Mutations

#### `api.locations.saveLocation`
```typescript
args: {
  title: v.string(),
  description: v.string(),
  latitude: v.number(),
  longitude: v.number(),
  source: v.union(v.literal("mapbox"), v.literal("exa"), v.literal("database")),
  timestamp: v.number(),
  city: v.union(v.literal("singapore"), v.literal("jakarta")), // Required
  isRandomizable: v.optional(v.boolean()),
  postalCode: v.optional(v.string()),
}
```

## Testing

### Test Coverage

All cross-border navigation logic is covered by unit tests:

```typescript
// src/lib/services/cross-border-navigation-service.spec.ts

describe("detectCrossBorder", () => {
  it("should detect same city (Singapore to Singapore)", async () => {
    // Expects: isCrossBorder = false, duration = 2500ms
  });

  it("should detect cross-border (Singapore to Jakarta)", async () => {
    // Expects: isCrossBorder = true, duration = 6500ms
  });

  it("should detect cross-border (Jakarta to Singapore)", async () => {
    // Expects: isCrossBorder = true, duration = 6500ms
  });
});
```

### Manual Testing Checklist

- [ ] **Root page redirect**
  1. Navigate to `/`
  2. Should redirect to `/singapore` automatically

- [ ] **City toggle button**
  1. On `/singapore`, click 🇮🇩 flag in bottom right
  2. Should fly to Jakarta with 3.5s animation
  3. URL should change to `/jakarta`
  4. Browser back button should return to `/singapore`

- [ ] **GPS city switching**
  1. On `/singapore`, click "Locate Me"
  2. If in Singapore → 2.5s animation, stays on `/singapore`
  3. If in Jakarta → 6.5s animation, URL updates to `/jakarta`

- [ ] **Location filtering**
  1. Save locations in both cities
  2. Random button on `/singapore` should only show Singapore locations
  3. Random button on `/jakarta` should only show Jakarta locations

- [ ] **Search result navigation**
  1. Search for "Marina Bay Sands" (Singapore)
  2. From `/jakarta`, selecting it should trigger 6.5s cross-border animation
  3. URL should update to `/singapore`

## Migration Guide

### Existing Database Locations

If you have existing locations without the `city` field, you have three options:

#### Option 1: Automated Migration Script (Recommended) ✅

Use the built-in Convex migration actions:

```bash
# 1. Preview what will change (dry run)
npx convex run migrations:previewLocationCitiesMigration

# 2. Review the output, then apply the migration
npx convex run migrations:migrateLocationCities
```

**Features:**
- ✅ Idempotent (safe to run multiple times)
- ✅ Detects city from coordinates automatically
- ✅ Preview mode (dry run)
- ✅ Detailed logging and statistics
- ✅ Error handling and rollback option

**See the complete guide:** [Migration Guide](./migration-guide.md)

#### Option 2: Delete and Re-save
```typescript
// The save action will auto-detect city from coordinates
// Simply delete old locations and save them again
```

#### Option 3: Manual Update via Convex Dashboard
```typescript
// For each location, add:
city: "singapore" // or "jakarta" based on coordinates
```

## Performance Considerations

### City Detection Caching

City detection calls Mapbox API on every save. To optimize:

```typescript
// Consider caching results based on rough coordinate grid
const cityCache = new Map<string, City>();

function getCacheKey(lat: number, lng: number): string {
  return `${Math.floor(lat * 10)},${Math.floor(lng * 10)}`;
}
```

### Query Optimization

City filtering uses indexed queries for optimal performance:
- `by_city` index for general queries
- `by_city_randomizable` compound index for random navigation

## Future Enhancements

### Potential Features

1. **Multi-city support**
   - Add more cities (Bangkok, Kuala Lumpur, etc.)
   - Update schema: `city: v.string()` (remove union constraint)

2. **City detection improvements**
   - Cache results to reduce API calls
   - Use coordinate bounds first before API call
   - Fallback to IP-based geolocation

3. **Enhanced toggle button**
   - Show both flags side-by-side
   - Add city name tooltip
   - Animation preview before flying

4. **Cross-city recommendations**
   - "Similar locations in Jakarta" when viewing Singapore location
   - Cross-border points of interest

## Troubleshooting

### Issue: Locations showing in wrong city

**Cause:** Existing locations without city field
**Solution:** Run migration script or re-save locations

### Issue: Cross-border animation not triggering

**Cause:** City detection failing
**Solution:** Check Mapbox token is valid and reverse geocoding API is enabled

### Issue: Toggle button not appearing

**Cause:** Map not ready or missing `isMapReady` state
**Solution:** Ensure map initialization completes before rendering button

### Issue: URL not updating after cross-border navigation

**Cause:** Router not available or cross-border detection logic incorrect
**Solution:** Verify `CrossBorderNavigationService` is properly integrated

## Code References

### Key Files

- **Schema:** `convex/schema.ts:22`
- **Queries:** `convex/locations.ts:33,77,96`
- **City Detection:** `src/lib/utils/detect-location.ts:8`
- **Cross-Border Service:** `src/lib/services/cross-border-navigation-service.ts:165`
- **Toggle Component:** `src/components/city-toggle-button.tsx`
- **Singapore Explorer:** `src/components/singapore-map-explorer.tsx:112,800`
- **Jakarta Explorer:** `src/components/jakarta-map-explorer.tsx:93,717`
- **Root Page:** `src/app/page.tsx:9`

### Service Dependencies

```
CityToggleButton
  ├── mapbox.Map (for flyTo)
  └── useRouter (for URL updates)

CrossBorderNavigationService
  ├── MapNavigationService (for flyTo execution)
  └── detectCityFromCoords (for city detection)

Map Explorers
  ├── Convex queries (filtered by city)
  ├── CrossBorderNavigationService (for navigation)
  └── CityToggleButton (for manual switching)
```

## Conclusion

The cross-border navigation system provides a seamless experience for users exploring both Singapore and Jakarta. By intelligently detecting city boundaries, filtering location data, and providing smooth animations, the application creates a cohesive multi-city mapping experience.
