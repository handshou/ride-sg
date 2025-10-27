# Building Highlight Feature

## Overview
Highlight specific buildings in purple on the map when a user selects a search result, using Mapbox's 3D building layer and feature-state API.

## Architecture

### 1. Structured Geocoding Integration
- **Purpose**: Get precise building-level addresses from search queries
- **Location**: `src/lib/utils/geocoding-utils.ts` (already implemented)
- **Usage**: Parse search results into structured addresses to geocode building coordinates

### 2. Building Highlight Service
- **File**: `src/lib/services/building-highlight-service.ts` (to be created)
- **Responsibilities**:
  - Query Mapbox for building footprints at specific coordinates
  - Set feature-state to highlight selected building
  - Clear previous highlights
  - Handle building not found cases

### 3. Map Integration
- **Files**:
  - `src/components/singapore-map-explorer.tsx`
  - `src/components/jakarta-map-explorer.tsx`
- **Changes**:
  - Listen for building selection events
  - Apply purple color to highlighted building
  - Zoom to building on selection

### 4. Search Flow Integration
- **File**: `src/lib/search-orchestrator.ts`
- **Changes**:
  - When user selects a search result, trigger building highlight
  - Pass building coordinates and address to highlight service

## Technical Implementation

### Mapbox Building Highlighting
```typescript
// 1. Query buildings at coordinates
const features = map.queryRenderedFeatures(point, {
  layers: ['building-3d']  // or your building layer ID
});

// 2. Set feature-state for purple highlight
map.setFeatureState(
  {
    source: 'composite',  // Mapbox tileset
    sourceLayer: 'building',
    id: buildingFeatureId
  },
  { highlight: true }
);

// 3. Add layer paint property
map.setPaintProperty('building-3d', 'fill-extrusion-color', [
  'case',
  ['boolean', ['feature-state', 'highlight'], false],
  '#9333ea',  // purple-600
  '#aaa'      // default gray
]);
```

### Service Interface
```typescript
export interface BuildingHighlightService {
  highlightBuilding(
    map: mapboxgl.Map,
    coordinates: { latitude: number; longitude: number },
    address?: StructuredAddress
  ): Effect.Effect<void, BuildingNotFoundError, never>;

  clearHighlight(
    map: mapboxgl.Map
  ): Effect.Effect<void, never, never>;
}
```

### Integration Flow
```
1. User searches "Marina Bay Sands"
2. Exa/Convex returns result with coordinates
3. Parse address into StructuredAddress
4. User clicks result in search panel
5. Geocode structured address → precise building coordinates
6. Call BuildingHighlightService.highlightBuilding()
7. Map queries building footprint at coordinates
8. Apply purple color via feature-state
9. Zoom map to building
```

## Benefits
- **Precise selection**: Structured geocoding ensures exact building match
- **Visual feedback**: Purple highlight shows exactly which building was found
- **Better UX**: Users immediately see their search result on the map
- **Scalable**: Works for any building with a Mapbox footprint

## Example Usage
```typescript
// In search result handler:
const result = selectedSearchResult;

// Parse to structured address
const structuredAddress = parseAddressString(result.address, "SG");

// Geocode for precise coordinates
const location = await geocodeStructuredAddress(structuredAddress, mapboxToken);

// Highlight building
await buildingHighlightService.highlightBuilding(
  map,
  location.coordinates,
  structuredAddress
);
```

## Color Palette
- **Highlighted building**: `#9333ea` (purple-600, Tailwind)
- **Default buildings**: `#aaa` (gray)
- **Building outline**: `#9333ea` with 2px width

## Next Steps
1. ✅ Add retry logic to cross-border navigation (DONE)
2. Create BuildingHighlightService
3. Integrate with search orchestrator
4. Add building selection state management
5. Update map explorer components
6. Test with real building addresses
