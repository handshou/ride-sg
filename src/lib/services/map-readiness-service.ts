import { Context, Effect, Layer } from "effect";

export interface MapReadinessService {
  /**
   * Check if a map instance is fully ready for marker operations
   */
  isMapReady(map: mapboxgl.Map): Effect.Effect<boolean>;

  /**
   * Wait for map to be ready with retry logic
   */
  waitForMapReady(
    map: mapboxgl.Map,
    maxRetries?: number,
    delayMs?: number,
  ): Effect.Effect<boolean>;

  /**
   * Create a readiness check Effect that can be composed
   */
  createReadinessCheck(map: mapboxgl.Map): Effect.Effect<boolean>;
}

export class MapReadinessServiceImpl implements MapReadinessService {
  isMapReady(map: mapboxgl.Map): Effect.Effect<boolean> {
    return Effect.sync(() => {
      try {
        // Check if map has container and style is loaded
        return !!(
          map.getContainer() &&
          map.isStyleLoaded() &&
          map.getCanvasContainer()
        );
      } catch {
        return false;
      }
    });
  }

  waitForMapReady(
    map: mapboxgl.Map,
    maxRetries: number = 5,
    delayMs: number = 100,
  ): Effect.Effect<boolean> {
    const self = this;
    return Effect.gen(function* () {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const isReady = yield* self.isMapReady(map);
        if (isReady) {
          return true;
        }

        if (attempt < maxRetries - 1) {
          yield* Effect.sleep(delayMs);
        }
      }
      return false;
    });
  }

  createReadinessCheck(map: mapboxgl.Map): Effect.Effect<boolean> {
    const self = this;
    return Effect.gen(function* () {
      // First check if immediately ready
      const immediateReady = yield* self.isMapReady(map);
      if (immediateReady) {
        return true;
      }

      // If not ready, wait with retries
      return yield* self.waitForMapReady(map);
    });
  }
}

// Context tag for dependency injection
export const MapReadinessServiceTag = Context.GenericTag<MapReadinessService>(
  "MapReadinessService",
);

// Service implementation layer
export const MapReadinessServiceLive = Layer.succeed(
  MapReadinessServiceTag,
  new MapReadinessServiceImpl(),
).pipe(Layer.tap(() => Effect.logDebug("🗺️ MapReadinessService initialized")));
