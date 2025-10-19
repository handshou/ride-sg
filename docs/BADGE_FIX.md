# Badge Fix: Distinguish Exa vs Convex Results

## Problem

All search results were showing the "🔍 Exa" badge, even when they came from the Convex database cache. This happened because:

1. Exa results are saved to Convex with `source: "exa"`
2. When fetched from Convex later, they still have `source: "exa"`
3. The badge UI checks `result.source === "exa"` to determine badge type
4. **Result**: All cached results incorrectly showed as "Exa"

## Solution

Override the `source` field to `"database"` when results come from Convex queries, so the UI can distinguish between:
- **Fresh Exa results** (current search) → `source: "exa"` → Show "🔍 Exa" badge
- **Cached Convex results** (database) → `source: "database"` → Show "💾 Convex" badge

## Changes Made

### 1. **ConvexService** - Override source for database results

**File:** `src/lib/services/convex-service.ts`

```typescript
// ❌ BEFORE - kept original source
const results: SearchResult[] = locations.map((loc) => ({
  id: loc._id,
  title: loc.title,
  description: loc.description,
  location: {
    latitude: loc.latitude,
    longitude: loc.longitude,
  },
  source: loc.source, // ❌ Could be "exa", shows wrong badge
  timestamp: loc.timestamp,
}));

// ✅ AFTER - override to "database"
const results: SearchResult[] = locations.map((loc) => ({
  id: loc._id,
  title: loc.title,
  description: loc.description,
  location: {
    latitude: loc.latitude,
    longitude: loc.longitude,
  },
  source: "database" as const, // ✅ Always "database" from Convex
  timestamp: loc.timestamp,
}));
```

**Applied to:**
- `searchLocations()` - Returns search results from Convex
- `getAllLocations()` - Returns all locations from Convex

### 2. **SearchPanel** - Update badge text

**File:** `src/components/search-panel.tsx`

```typescript
// Changed badge text from "Saved" to "Convex"
<Badge variant={result.source === "exa" ? "default" : "secondary"}>
  {result.source === "exa" ? "🔍 Exa" : "💾 Convex"}
</Badge>
```

## How It Works

### Search Flow

```
┌─────────────────────────────────────────────────────────┐
│                    First Search                         │
├─────────────────────────────────────────────────────────┤
│  User searches: "Din Tai Fung"                          │
│  ↓                                                       │
│  1. Check Convex (empty)                                │
│  2. Fetch from Exa API                                  │
│     - Result has source: "exa"                          │
│     - Shows "🔍 Exa" badge                               │
│  3. Save to Convex (stores with source: "exa")          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   Second Search (Cached)                │
├─────────────────────────────────────────────────────────┤
│  User searches: "Din Tai Fung" again                    │
│  ↓                                                       │
│  1. Check Convex (found!)                               │
│     - DB has source: "exa" (original)                   │
│     - ConvexService overrides to source: "database"     │
│     - Shows "💾 Convex" badge ✅                         │
│  2. Skip Exa API (cache hit)                            │
└─────────────────────────────────────────────────────────┘
```

## Badge Logic

```typescript
// Badge displays based on source field:
source === "exa"      → "🔍 Exa"     (purple, primary)
source === "database" → "💾 Convex"  (gray, secondary)
source === "mapbox"   → "💾 Convex"  (gray, secondary)
```

## Why This Approach?

### ✅ Advantages

1. **Clear distinction** - Users know if data is fresh (Exa) or cached (Convex)
2. **No database changes** - Don't need to migrate existing data
3. **Transparent** - Original source preserved in database for debugging
4. **Simple** - Just override at query time, not mutation time

### ❌ Alternative Approaches (Not Used)

**Option 1: Change source when saving**
```typescript
// ❌ Loses information about original source
dbService.saveLocation({ ...result, source: "database" });
```
- **Problem**: Can't tell if data originally came from Exa or Mapbox

**Option 2: Add new field**
```typescript
// ❌ Requires schema migration
interface SearchResult {
  source: "exa" | "mapbox" | "database";
  retrievedFrom: "cache" | "api"; // New field
}
```
- **Problem**: More complex, requires database migration

## Testing

```bash
✅ Lint: passed
✅ Type-check: passed
✅ Tests: 31 passed
✅ Build: successful
```

## User Experience

### Before Fix
```
Search "Din Tai Fung"
Results:
1. Din Tai Fung | 🔍 Exa | 1.2834, 103.8607

Search "Din Tai Fung" again (cached)
Results:
1. Din Tai Fung | 🔍 Exa | 1.2834, 103.8607
❌ Still shows Exa badge, but came from Convex!
```

### After Fix
```
Search "Din Tai Fung"
Results:
1. Din Tai Fung | 🔍 Exa | 1.2834, 103.8607

Search "Din Tai Fung" again (cached)
Results:
1. Din Tai Fung | 💾 Convex | 1.2834, 103.8607
✅ Correctly shows Convex badge!
```

## Summary

✨ **The badge fix provides:**
- 🎯 Clear visual distinction between fresh and cached results
- 💾 "Convex" badge for database results (gray)
- 🔍 "Exa" badge for fresh API results (purple)
- 🔄 Works perfectly with refresh button
- 📊 Preserves original source in database

**Now users can easily see:**
- Which results are fresh from Exa AI
- Which results are cached in Convex
- When to use the refresh button to get latest data

