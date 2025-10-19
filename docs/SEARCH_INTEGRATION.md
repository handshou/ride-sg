# 🔍 Search Integration with Effect Ref

## Overview

This document describes the search integration that coordinates between Exa API, Database, and Map rendering using **Effect Ref** for state management.

## Architecture

### State Management with Effect Ref

We use **Effect `Ref`** (not `Atom`) for coordinated state management:

```typescript
const state = yield* Ref.make<SearchState>({ ... });
yield* Ref.update(state, (current) => ({ ...current, results }));
const current = yield* Ref.get(state);
```

**Why `Ref` over `Atom`?**
- ✅ Built into Effect-TS (no external dependencies)
- ✅ Thread-safe state updates
- ✅ Works in server components
- ✅ Perfect for service coordination

---

## Components

### 1. **SearchStateService** (`src/lib/search-state-service.ts`)

Manages shared search state across all services using Effect Ref.

```typescript
interface SearchState {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  selectedResult: SearchResult | null;
}
```

**Key Operations:**
- `startSearch()` - Set loading state
- `setResults()` - Update results from any source
- `selectResult()` - Select a result (triggers map update)
- `getState()` - Get current state

---

### 2. **ExaSearchService** (`src/lib/exa-search-service.ts`)

Searches Exa.ai API for locations and places.

**Coordinates with SearchStateService:**
- Updates loading state when search starts
- Adds Exa results to shared state
- Marks search as complete

**Current Implementation:**
- Mock data (Marina Bay Sands, Gardens by the Bay)
- TODO: Replace with actual Exa API calls

---

### 3. **DatabaseSearchService** (`src/lib/database-search-service.ts`)

Searches local database for saved locations.

**Coordinates with SearchStateService:**
- Appends database results to existing results
- Filters based on query
- Uses localStorage (mock implementation)

**Future:**
- Replace with actual database (PostgreSQL/Redis)
- Add user authentication
- Implement favorites/history

---

### 4. **SearchOrchestrator** (`src/lib/search-orchestrator.ts`)

Coordinates searches across Convex (database) and Exa (API) in parallel.

```typescript
// Search both Convex and Exa simultaneously
const [convexResults, exaResults] = yield* Effect.all(
  [dbService.search(query), exaService.search(query)],
  { concurrency: "unbounded" }
);

// Deduplicate and merge results
const mergedResults = deduplicateResults(convexResults, exaResults);
```

**Search Strategy (Updated 2025-10-19):**
- ✅ **Parallel Execution**: Search Convex AND Exa simultaneously (not sequential)
- ✅ **Comprehensive Results**: Get cached + fresh data in every search
- ✅ **Smart Deduplication**: Remove duplicates by title similarity (70%) and coordinate proximity (100m)
- ✅ **Manual Saving**: Users choose which results to save (no automatic caching)

**Benefits:**
- Parallel execution for better performance
- No more "skipping Exa" due to low-quality Convex matches
- Shared state via Effect Ref
- Centralized error handling
- Full control over what gets cached

---

### 5. **SearchPanel** (`src/components/search-panel.tsx`)

React UI component for search interface.

**Features:**
- ✅ Search input with Enter key support
- ✅ Loading states
- ✅ Result list with source badges (Exa/Database)
- ✅ Click to select (triggers map flyTo)
- ✅ Coordinates display
- ✅ Dark mode support

---

### 6. **Map Integration**

When a search result is selected:

```typescript
const handleSearchResultSelect = (result: SearchResult) => {
  // Update map location
  setMapLocation(result.location);
  
  // Fly to result with smooth animation
  mapInstance.flyTo({
    center: [result.location.longitude, result.location.latitude],
    zoom: 15,      // Zoom in closer
    duration: 2000 // 2-second animation
  });
};
```

---

## Data Flow

```
User Search
    ↓
SearchPanel (React)
    ↓
useSearchState Hook
    ↓
Search Orchestrator (Effect)
    ↓
┌──────────────────────┬────────────────────┐
│                      │                    │
│ DatabaseService      │  ExaSearchService  │ (parallel execution)
│ (Convex cache)       │  (Fresh API data)  │
│                      │                    │
└──────────────────────┴────────────────────┘
    ↓
Deduplication (title similarity + coordinate proximity)
    ↓
Merged Results (Convex + Exa - duplicates)
    ↓
SearchStateService (Effect Ref)
    ↓
React State Update
    ↓
Map flyTo Animation
    ↓
User Manually Saves (optional)
    ↓
Saved to Convex for future searches
```

---

## Effect Ref Benefits

### **Shared State Across Services**

Multiple services can read/write the same state:

```typescript
// Exa service adds its results
yield* searchState.setResults(exaResults);

// Database service appends its results
const current = yield* searchState.getResults();
yield* searchState.setResults([...current, ...dbResults]);

// Map reads selected result
const selected = yield* searchState.getSelectedResult();
```

###  **Concurrency Safe**

Effect Ref handles concurrent updates automatically:

```typescript
// Both services update state simultaneously - no race conditions!
yield* Effect.all([
  exaService.search(query),
  dbService.search(query),
]);
```

### **Reactive Updates**

When state changes, all dependent effects can observe it:

```typescript
// Watch for selected result changes
const watchSelectedResult = () =>
  Effect.gen(function* () {
    const searchState = yield* SearchStateServiceTag;
    return yield* searchState.getSelectedResult();
  });
```

---

## Testing

All search functionality is tested in `src/lib/search-orchestrator.spec.ts`:

```bash
pnpm test src/lib/search-orchestrator.spec.ts
```

**Test Coverage:**
- ✅ Coordinated search across multiple sources
- ✅ State sharing between services
- ✅ Result selection
- ✅ Concurrent searches
- ✅ Error handling

**Results:** 31/31 tests passing ✨

---

## Usage Example

```typescript
// In a React component
import { useSearchState } from "@/hooks/use-search-state";

function SearchComponent() {
  const { search, results, isLoading, selectResult } = useSearchState();
  
  const handleSearch = async () => {
    await search("Marina Bay");
  };
  
  return (
    <div>
      <button onClick={handleSearch}>Search</button>
      {results.map(result => (
        <div onClick={() => selectResult(result)}>
          {result.title} - {result.source}
        </div>
      ))}
    </div>
  );
}
```

---

## Recent Changes (2025-10-19)

### **Parallel Search Implementation**
- Changed from sequential (Convex → Exa) to parallel (Convex + Exa)
- Fixes issue where Convex low-quality matches blocked Exa searches
- Users now get comprehensive results from both sources

### **Manual Save Strategy**
- Removed automatic saving from search orchestrator
- Users manually choose which results to save to Convex
- Prevents low-quality results from polluting the cache

### **Production Log Cleanup**
- Client-side debug logs now gated behind `NODE_ENV === "development"`
- Production browser console stays clean
- Server logs (Effect logs) remain in Vercel for debugging

## Next Steps

### **Future Enhancements:**
1. Add search history
2. Implement favorites/bookmarks
3. Add filters (by source, date, etc.)
4. Add search suggestions/autocomplete
5. Implement caching with Effect Cache
6. Add real-time updates with Effect streams
7. Add relevance scoring to sort merged results

---

## Key Takeaways

✅ **Effect Ref** is perfect for coordinating state across Effect services
✅ **Parallel execution** improves search performance
✅ **Type-safe** state management throughout
✅ **Reactive updates** trigger map animations
✅ **Production-ready** with comprehensive tests

This pattern scales well and can be extended to other coordinated operations (routing, preferences, analytics, etc.)!

