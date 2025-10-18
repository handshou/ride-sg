# Refresh Location Feature

## Overview

Added a **Refresh button** (🔄) next to each search result that fetches the latest data from Exa AI and updates Convex with fresh information.

## Features

### 1. **Improved Convex Search** - Smart Keyword Matching

**Before:** Simple `includes()` check
```typescript
loc.title.toLowerCase().includes(query.toLowerCase())
```

**After:** Word-overlap similarity scoring (0-1 scale)
```typescript
function calculateSimilarity(str1: string, str2: string): number {
  // Compares word overlap between strings
  // Returns score 0-1 (0 = no match, 1 = perfect match)
  // Filters results with score >= 0.4
}
```

**Benefits:**
- ✅ Only returns high-confidence matches (≥40% similarity)
- ✅ Sorted by relevance (best matches first)
- ✅ Prevents false positives from partial word matches
- ✅ Works with multi-word queries

**Example:**
```typescript
Query: "Marina Bay"
Results:
1. "Marina Bay Sands" (score: 0.8) ✅
2. "Marina Bay Financial Centre" (score: 0.7) ✅
3. "Gardens by the Bay" (score: 0.3) ❌ (filtered out)
```

### 2. **Refresh Button** - Update Location Data

**UI Changes:**
- Added 🔄 **Refresh button** next to each result
- Shows spinning animation while refreshing
- Prevents accidental clicks during refresh
- Updates both UI and Convex database

**How it works:**
```
1. User clicks refresh button 🔄
2. Server action calls Exa Answer API
3. Gets latest location data with address
4. Geocodes with Mapbox for precise coordinates
5. Updates Convex database
6. Refreshes search results
7. Shows updated data on map
```

### 3. **Server Action** - `refreshLocationAction`

Located at: `src/lib/actions/refresh-location-action.ts`

```typescript
export async function refreshLocationAction(
  locationName: string,
  locationId?: string,
): Promise<{ result: SearchResult | null; error?: string }>;
```

**Purpose:** Securely refresh location data from Exa (server-side only)

**Parameters:**
- `locationName` - Name of the location to refresh
- `locationId` - Optional Convex ID to update existing record

**Returns:**
- `result` - Updated location with fresh data
- `error` - Error message if refresh failed

### 4. **Convex Update Mutation** - `updateLocation`

Located at: `convex/locations.ts`

```typescript
export const updateLocation = mutation({
  args: {
    id: v.id("locations"),
    title: v.string(),
    description: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    source: v.union(v.literal("mapbox"), v.literal("exa"), v.literal("database")),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});
```

**Purpose:** Update existing location records in Convex

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface (Client)                   │
├─────────────────────────────────────────────────────────────┤
│  Search Result                                               │
│  ┌─────────────────────────────────────────────────┐        │
│  │ 📍 Marina Bay Sands                 [🔄]        │        │
│  │ Iconic hotel with rooftop pool                  │        │
│  │ 🔍 Exa  1.2834, 103.8607                        │        │
│  └─────────────────────────────────────────────────┘        │
│                      ↓ (user clicks refresh)                 │
├─────────────────────────────────────────────────────────────┤
│              Server Action (Server-Side)                     │
│  refreshLocationAction("Marina Bay Sands", "id123")          │
│                      ↓                                       │
│  1. Call Exa Answer API (with EXA_API_KEY)                  │
│     - Query: "Find exact location Marina Bay Sands..."      │
│     - Returns: Latest data with address                     │
│                      ↓                                       │
│  2. Geocode with Mapbox (with MAPBOX_ACCESS_TOKEN)         │
│     - Input: "Marina Bay Sands, 10 Bayfront Ave..."         │
│     - Returns: { lat: 1.2834, lng: 103.8607 }               │
│                      ↓                                       │
│  3. Update Convex Database                                   │
│     - Mutation: updateLocation({ id, title, desc, lat, lng })│
│     - Updates existing record with fresh data                │
│                      ↓                                       │
│  4. Return updated result to client                          │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### User Perspective

1. **Search for a location:** Type "Din Tai Fung" and press Enter
2. **View results:** See list of locations with coordinates
3. **Refresh data:** Click the 🔄 button next to any result
4. **Wait:** Button shows spinning animation
5. **Updated:** Latest data from Exa appears, map updates

### Developer Perspective

```typescript
// In SearchPanel component
const handleRefresh = async (result: SearchResult, e: React.MouseEvent) => {
  e.stopPropagation(); // Don't select the result
  setRefreshingId(result.id);

  try {
    const { result: refreshedResult, error } = 
      await refreshLocationAction(result.title, result.id);

    if (refreshedResult) {
      // Refresh search results to show updated data
      await search(query);
      onResultSelect(refreshedResult);
    }
  } finally {
    setRefreshingId(null);
  }
};
```

## Code Changes

### Files Modified

1. **`convex/locations.ts`**
   - Added `calculateSimilarity()` function
   - Improved `searchLocations` query with similarity scoring
   - Added `updateLocation` mutation

2. **`src/lib/actions/refresh-location-action.ts`** (new)
   - Server action for refreshing locations

3. **`src/lib/services/exa-search-service.ts`**
   - Made `extractLocationEntries()` public (was private)
   - Made `geocodeLocation()` public (was private)
   - Added `refreshLocationFromExa()` function

4. **`src/components/search-panel.tsx`**
   - Added refresh button UI
   - Added `handleRefresh()` handler
   - Added loading state for refresh operation

## Testing

```bash
✅ Lint: passed
✅ Type-check: passed
✅ Tests: 31 passed
✅ Build: successful
```

## Security

- ✅ **API keys stay server-side** - Refresh happens via server action
- ✅ **No client-side exposure** - EXA_API_KEY and MAPBOX_ACCESS_TOKEN secure
- ✅ **Type-safe** - Effect.Schema validates all data
- ✅ **Error handling** - Graceful failures with user feedback

## Benefits

### For Users
- 🔄 **Always fresh data** - Update location info anytime
- 🎯 **More accurate** - Latest coordinates and descriptions
- ⚡ **Fast** - Only refreshes specific location, not full search
- 📍 **Better results** - Improved keyword matching

### For Developers
- 🔐 **Secure** - Server-side API calls
- 🎨 **Reusable** - `refreshLocationFromExa()` can be called anywhere
- 🧪 **Tested** - All tests pass
- 📝 **Type-safe** - Full TypeScript coverage

## Example Scenarios

### Scenario 1: Outdated Information
```
User searches: "Din Tai Fung"
Result shows: Old address from last month
User clicks 🔄 refresh
New result shows: Current address (they moved!)
Map updates with new coordinates
```

### Scenario 2: Poor Initial Results
```
User searches: "Hawker Centre"
Convex returns: Low similarity match (score: 0.3)
No results shown (filtered out)
User searches again with better keywords
Gets better results with high similarity (score: 0.7+)
```

### Scenario 3: Data Enhancement
```
User searches: "Marina"
Result shows: Basic info from old Exa search
User clicks 🔄 refresh
New result shows: Enhanced description, better coordinates
Convex updated with latest data
Future searches use fresh data
```

## Future Improvements

1. **Batch refresh** - Refresh all results at once
2. **Auto-refresh** - Automatic updates for stale data (> 30 days)
3. **Refresh indicator** - Show last refresh timestamp
4. **Confidence score** - Display similarity score in UI
5. **Smart suggestions** - Recommend refresh for low-quality data

## Summary

✨ **The refresh feature provides:**
- 🔄 On-demand data updates from Exa
- 🎯 Improved search accuracy with similarity matching
- 🔐 Secure server-side API operations
- 📊 Convex database updates with fresh data
- 🗺️ Real-time map updates with new coordinates

**Try it now:** Search for any Singapore location and click the refresh button! 🚀

