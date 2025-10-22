# Mapbox Layer Persistence Pattern

## The Problem

When you change a Mapbox GL JS map style (e.g., from "dark" to "satellite"), the map loads a completely new style, which **removes all custom layers and sources**. This includes:

- ❌ Custom layers (bicycle parking, heatmaps, 3D buildings)
- ❌ Custom sources (GeoJSON, raster, vector)
- ✅ Markers stay (they're DOM elements, not Mapbox layers)

## The Solution: Listeners & Callbacks

Mapbox provides event listeners that fire when the style changes. The key events are:

### 1. **`styledata`** Event
Fires multiple times during style loading (best for re-adding layers):

```typescript
map.on("styledata", () => {
  // Re-add your custom layers here
  // This fires multiple times, so check if layer already exists
  if (!map.getLayer("my-layer-id")) {
    map.addLayer(myLayerConfig);
  }
});
```

### 2. **`style.load`** Event
Fires once when style is fully loaded (best for one-time setup):

```typescript
map.once("style.load", () => {
  // Style is fully loaded, safe to add layers
  map.addLayer(myLayerConfig);
});
```

## Implementation Patterns in This Project

### ✅ Pattern 1: Bicycle Parking Overlay

**File:** `src/components/bicycle-parking-overlay.tsx`

**Strategy:** Listen to `styledata` event and re-run `setupLayers()`

```typescript
useEffect(() => {
  const SOURCE_ID = "bicycle-parking";
  const LAYER_ID = "bicycle-parking-layer";

  const setupLayers = () => {
    // Check if source exists, if not add it
    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: geoJsonData,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });
    }

    // Check if layers exist, if not add them
    if (!map.getLayer(LAYER_ID)) {
      map.addLayer({
        id: LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: { /* ... */ }
      });
    }
  };

  // Initial setup
  setupLayers();

  // Listen for style changes and re-add layers
  const handleStyleData = () => {
    logger.debug("Style changed, re-adding bicycle parking layers");
    setupLayers();
  };

  map.on("styledata", handleStyleData);

  // Cleanup
  return () => {
    map.off("styledata", handleStyleData);
    // Remove layers and sources
  };
}, [map, parkingLocations]);
```

**Key Points:**
- ✅ Idempotent `setupLayers()` function (safe to call multiple times)
- ✅ Checks if source/layer exists before adding
- ✅ Listens to `styledata` event
- ✅ Cleans up listener on unmount

### ✅ Pattern 2: Rainfall Heatmap Overlay

**File:** `src/components/rainfall-heat-map-overlay.tsx`

**Strategy:** Listen to `styledata` with timeout for reliability

```typescript
useEffect(() => {
  if (!map) return;

  let timeoutId: NodeJS.Timeout | null = null;

  const handleStyleLoad = () => {
    logger.info("🗺️ Map style changed, will re-add rainfall layer");
    
    // Clear any pending timeout
    if (timeoutId) clearTimeout(timeoutId);

    // Wait for style to be fully loaded before re-adding
    timeoutId = setTimeout(() => {
      if (!map.isStyleLoaded()) {
        logger.warn("⚠️ Style not fully loaded after timeout");
        return;
      }

      const sourceId = sourceIdRef.current;
      const layerId = layerIdRef.current;

      try {
        // Re-add source if missing
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: "geojson",
            data: geoJsonData,
          });
          logger.info(`✅ Re-added source: ${sourceId}`);
        } else {
          // Update existing source data
          const source = map.getSource(sourceId);
          if (source && source.type === "geojson") {
            source.setData(geoJsonData);
            logger.info(`♻️ Updated source data: ${sourceId}`);
          }
        }

        // Re-add layer if missing
        if (!map.getLayer(layerId)) {
          map.addLayer({
            id: layerId,
            type: "heatmap",
            source: sourceId,
            paint: { /* ... */ }
          });
          logger.info(`✅ Re-added layer: ${layerId}`);
        }
      } catch (error) {
        logger.error("Error re-adding rainfall layer:", error);
      }
    }, 500); // 500ms delay for reliability
  };

  // Listen to styledata event
  map.on("styledata", handleStyleLoad);

  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    map.off("styledata", handleStyleLoad);
  };
}, [map, rainfallData, useInterpolation]);
```

**Key Points:**
- ✅ Uses timeout to ensure style is fully loaded (500ms)
- ✅ Checks `map.isStyleLoaded()` before proceeding
- ✅ Updates existing source data instead of removing/re-adding
- ✅ Comprehensive error handling and logging
- ✅ Cleanup includes timeout and listener

### ✅ Pattern 3: 3D Buildings Toggle

**File:** `src/components/singapore-map-explorer.tsx`

**Strategy:** Listen to `styledata` and conditionally re-add based on state

```typescript
useEffect(() => {
  if (!mapInstanceRef.current || !isMapReady) return;

  const map = mapInstanceRef.current;

  const toggle3DBuildings = () => {
    // Wait for style to be loaded
    if (!map.isStyleLoaded()) {
      map.once("style.load", toggle3DBuildings);
      return;
    }

    const layer = map.getLayer("3d-buildings");

    if (show3DBuildings && !layer) {
      // Add 3D buildings layer
      map.addLayer({
        id: "3d-buildings",
        source: "composite",
        "source-layer": "building",
        type: "fill-extrusion",
        // ... config
      });
      logger.info("3D buildings layer added");
    } else if (!show3DBuildings && layer) {
      // Remove layer
      map.removeLayer("3d-buildings");
      logger.info("3D buildings layer removed");
    }
  };

  // Initial toggle
  toggle3DBuildings();

  // Listen for style changes and re-add if enabled
  const handleStyleData = () => {
    if (show3DBuildings) {
      logger.info("🗺️ Map style changed, re-adding 3D buildings");
      setTimeout(() => toggle3DBuildings(), 100);
    }
  };

  map.on("styledata", handleStyleData);

  return () => {
    map.off("styledata", handleStyleData);
  };
}, [show3DBuildings, isMapReady, mapStyle]);
```

**Key Points:**
- ✅ Conditional re-addition based on state (`show3DBuildings`)
- ✅ Uses `style.load` for initial check
- ✅ Uses `styledata` for subsequent style changes
- ✅ Small timeout (100ms) for reliability
- ✅ Depends on `mapStyle` to trigger re-render on style change

## Event Comparison

| Event | When It Fires | Use Case |
|-------|---------------|----------|
| `styledata` | Multiple times during style loading | ✅ **Best for re-adding layers** (fires after each style data chunk) |
| `style.load` | Once when style fully loaded | ✅ Good for one-time setup or fallback |
| `load` | Once when map first loads | ❌ Not useful for style changes |
| `data` | When any data loads (tiles, etc.) | ❌ Too frequent, not specific to style |

## Best Practices

### ✅ DO:

1. **Always check if layer/source exists before adding:**
   ```typescript
   if (!map.getLayer(layerId)) {
     map.addLayer(layerConfig);
   }
   ```

2. **Use `isStyleLoaded()` before manipulating layers:**
   ```typescript
   if (!map.isStyleLoaded()) {
     map.once("style.load", callback);
     return;
   }
   ```

3. **Add timeouts for complex operations:**
   ```typescript
   setTimeout(() => {
     if (map.isStyleLoaded()) {
       map.addLayer(config);
     }
   }, 100-500); // 100ms for simple, 500ms for complex
   ```

4. **Clean up listeners on unmount:**
   ```typescript
   return () => {
     map.off("styledata", handleStyleData);
   };
   ```

5. **Log layer operations for debugging:**
   ```typescript
   logger.info("✅ Layer added:", layerId);
   logger.warn("⚠️ Style not loaded, waiting...");
   logger.error("❌ Failed to add layer:", error);
   ```

### ❌ DON'T:

1. **Don't assume layers persist across style changes** - They won't!
2. **Don't add layers without checking if they exist** - Will cause errors
3. **Don't forget to clean up listeners** - Memory leaks
4. **Don't add layers immediately after `setStyle()`** - Wait for `styledata` or `style.load`
5. **Don't use `load` event for style changes** - It only fires once on initial load

## Example: Adding a New Custom Layer

Here's a complete example of adding a new custom layer that persists across style changes:

```typescript
useEffect(() => {
  if (!map) return;

  const LAYER_ID = "my-custom-layer";
  const SOURCE_ID = "my-custom-source";

  const setupCustomLayer = () => {
    // Wait for style to be loaded
    if (!map.isStyleLoaded()) {
      map.once("style.load", setupCustomLayer);
      return;
    }

    try {
      // Add source if it doesn't exist
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: myGeoJsonData,
        });
        logger.info(`✅ Added source: ${SOURCE_ID}`);
      } else {
        // Update existing source
        const source = map.getSource(SOURCE_ID);
        if (source && source.type === "geojson") {
          source.setData(myGeoJsonData);
          logger.info(`♻️ Updated source: ${SOURCE_ID}`);
        }
      }

      // Add layer if it doesn't exist
      if (!map.getLayer(LAYER_ID)) {
        map.addLayer({
          id: LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          paint: {
            "circle-radius": 6,
            "circle-color": "#007cbf",
          },
        });
        logger.info(`✅ Added layer: ${LAYER_ID}`);
      }
    } catch (error) {
      logger.error("Failed to setup custom layer:", error);
    }
  };

  // Initial setup
  setupCustomLayer();

  // Listen for style changes
  const handleStyleData = () => {
    logger.info("🗺️ Style changed, re-adding custom layer");
    // Small delay for reliability
    setTimeout(() => setupCustomLayer(), 100);
  };

  map.on("styledata", handleStyleData);

  // Cleanup
  return () => {
    map.off("styledata", handleStyleData);
    
    if (map.isStyleLoaded()) {
      if (map.getLayer(LAYER_ID)) {
        map.removeLayer(LAYER_ID);
      }
      if (map.getSource(SOURCE_ID)) {
        map.removeSource(SOURCE_ID);
      }
    }
  };
}, [map, myGeoJsonData]);
```

## Debugging Tips

### 1. Check if layer exists:
```typescript
const layer = map.getLayer("my-layer-id");
console.log("Layer exists:", !!layer);
```

### 2. Check if source exists:
```typescript
const source = map.getSource("my-source-id");
console.log("Source exists:", !!source);
```

### 3. Check if style is loaded:
```typescript
console.log("Style loaded:", map.isStyleLoaded());
```

### 4. List all layers:
```typescript
const style = map.getStyle();
console.log("All layers:", style.layers.map(l => l.id));
```

### 5. Monitor style events:
```typescript
map.on("styledata", () => console.log("styledata event fired"));
map.on("style.load", () => console.log("style.load event fired"));
map.on("data", (e) => console.log("data event:", e.sourceId));
```

## Summary

✅ **All custom layers are already using this pattern correctly:**
- Bicycle Parking: ✅ Uses `styledata` listener
- Rainfall Heatmap: ✅ Uses `styledata` listener with timeout
- 3D Buildings: ✅ Uses `styledata` listener with conditional re-add

✅ **Markers don't need this pattern** - They're DOM elements that persist automatically

✅ **The pattern is robust and production-ready** - Just follow the same pattern for any new custom layers!

## Related Files

- `src/components/bicycle-parking-overlay.tsx` - Bicycle parking layers
- `src/components/rainfall-heat-map-overlay.tsx` - Rainfall heatmap layers
- `src/components/singapore-map-explorer.tsx` - 3D buildings layer
- `src/components/mapbox-gl-map.tsx` - Base map component
- `src/components/saved-locations-overlay.tsx` - Markers (no listener needed)

