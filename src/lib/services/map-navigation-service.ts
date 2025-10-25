import { Context, Effect, Layer } from "effect";
import type mapboxgl from "mapbox-gl";
import { logger } from "../client-logger";
import { runClientEffectAsync } from "../client-runtime";

/**
 * Options for map flyTo navigation
 */
export interface FlyToOptions {
  coordinates: { latitude: number; longitude: number };
  zoom?: number;
  duration?: number;
  pitch?: number;
  bearing?: number;
  curve?: number;
  easing?: (t: number) => number;
  isMobile?: boolean;
}

/**
 * Error types for map navigation
 */
export class MapNavigationError {
  readonly _tag = "MapNavigationError";
  constructor(
    public readonly message: string,
    public readonly cause?: unknown,
  ) {}
}

export class MapNotReadyError {
  readonly _tag = "MapNotReadyError";
  constructor(public readonly message: string) {}
}

/**
 * MapNavigationService Interface
 *
 * Provides general-purpose map navigation with flyTo animations.
 * This is a client-side service that handles all map movement operations.
 *
 * Use this service for:
 * - Flying to search results
 * - Flying to saved locations
 * - Flying to bicycle parking
 * - Flying to image locations
 * - Any other map navigation needs
 */
export interface MapNavigationService {
  /**
   * Fly to a location on the map with smooth animation
   *
   * This method:
   * 1. Checks if map is ready
   * 2. Stops any ongoing animations
   * 3. Executes flyTo with specified options
   * 4. Waits for animation to complete
   *
   * @param map - Mapbox map instance
   * @param options - FlyTo configuration
   * @returns Effect that completes after flyTo animation
   *
   * @example
   * ```typescript
   * await runClientEffectAsync(
   *   Effect.gen(function* () {
   *     const mapNav = yield* MapNavigationService;
   *     yield* mapNav.flyTo(map, {
   *       coordinates: { latitude: 1.3521, longitude: 103.8198 },
   *       zoom: 16,
   *       duration: 2000,
   *       isMobile: false
   *     });
   *   })
   * );
   * ```
   */
  flyTo(
    map: mapboxgl.Map,
    options: FlyToOptions,
  ): Effect.Effect<void, MapNotReadyError, never>;

  /**
   * Fly to a location with default settings optimized for search results
   *
   * Applies preset options for search result navigation:
   * - Close zoom (16-17 depending on mobile)
   * - 2.5s cinematic animation
   * - High arc curve (1.6)
   * - Custom easing for smooth motion
   * - 50° pitch and 30° bearing for 3D view
   *
   * @param map - Mapbox map instance
   * @param coordinates - Target location
   * @param isMobile - Mobile device flag
   * @returns Effect that completes after flyTo animation
   */
  flyToSearchResult(
    map: mapboxgl.Map,
    coordinates: { latitude: number; longitude: number },
    isMobile: boolean,
  ): Effect.Effect<void, MapNotReadyError, never>;

  /**
   * Fly to a location with default settings optimized for parking locations
   *
   * Applies preset options for parking navigation:
   * - Very close zoom (17-18 depending on mobile)
   * - 2s animation
   * - Medium arc curve (1.4)
   * - Smooth easing
   *
   * @param map - Mapbox map instance
   * @param coordinates - Target location
   * @param isMobile - Mobile device flag
   * @returns Effect that completes after flyTo animation
   */
  flyToParking(
    map: mapboxgl.Map,
    coordinates: { latitude: number; longitude: number },
    isMobile: boolean,
  ): Effect.Effect<void, MapNotReadyError, never>;

  /**
   * Fly to a location with default settings optimized for random/saved locations
   *
   * Applies preset options for random location navigation:
   * - Medium zoom (9-12 depending on mobile)
   * - 1.5s animation
   * - Low arc curve (1.2)
   * - Simple easing
   *
   * @param map - Mapbox map instance
   * @param coordinates - Target location
   * @param isMobile - Mobile device flag
   * @returns Effect that completes after flyTo animation
   */
  flyToRandomLocation(
    map: mapboxgl.Map,
    coordinates: { latitude: number; longitude: number },
    isMobile: boolean,
  ): Effect.Effect<void, MapNotReadyError, never>;
}

/**
 * Implementation of MapNavigationService
 */
export class MapNavigationServiceImpl implements MapNavigationService {
  flyTo(
    map: mapboxgl.Map,
    options: FlyToOptions,
  ): Effect.Effect<void, MapNotReadyError, never> {
    return Effect.gen(function* () {
      // Check if map is ready
      if (!map || !map.isStyleLoaded()) {
        return yield* Effect.fail(
          new MapNotReadyError("Map is not ready for flyTo animation"),
        );
      }

      // Apply defaults
      const isMobile = options.isMobile ?? false;
      const zoom = options.zoom ?? (isMobile ? 15 : 16);
      const duration = options.duration ?? 2000;
      const curve = options.curve ?? 1.4;
      const easing = options.easing ?? ((t: number) => t * (2 - t));

      yield* Effect.logInfo(
        `FlyTo: [${options.coordinates.latitude}, ${options.coordinates.longitude}] zoom=${zoom} duration=${duration}ms`,
      );

      // Execute flyTo in a promise that resolves after animation
      yield* Effect.promise(
        () =>
          new Promise<void>((resolve) => {
            map.stop(); // Stop any ongoing animations

            requestAnimationFrame(() => {
              // Build flyTo options - cast needed for tuple type
              const flyToOptions = {
                center: [
                  options.coordinates.longitude,
                  options.coordinates.latitude,
                ] as [number, number],
                zoom,
                duration,
                essential: true,
                curve,
                easing,
              } as mapboxgl.CameraOptions & { curve: number };

              // Add optional parameters if provided
              if (options.pitch !== undefined) {
                flyToOptions.pitch = options.pitch;
              }
              if (options.bearing !== undefined) {
                flyToOptions.bearing = options.bearing;
              }

              map.flyTo(flyToOptions);

              // Resolve after animation completes
              setTimeout(resolve, duration);
            });
          }),
      );

      yield* Effect.logInfo("FlyTo animation completed");
    });
  }

  flyToSearchResult(
    map: mapboxgl.Map,
    coordinates: { latitude: number; longitude: number },
    isMobile: boolean,
  ): Effect.Effect<void, MapNotReadyError, never> {
    return this.flyTo(map, {
      coordinates,
      zoom: isMobile ? 16 : 17,
      duration: 2500,
      curve: 1.6,
      pitch: 50,
      bearing: 30,
      easing: (t) => {
        // Custom easing: slow start, fast middle, slow end
        return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      },
      isMobile,
    });
  }

  flyToParking(
    map: mapboxgl.Map,
    coordinates: { latitude: number; longitude: number },
    isMobile: boolean,
  ): Effect.Effect<void, MapNotReadyError, never> {
    return this.flyTo(map, {
      coordinates,
      zoom: isMobile ? 17 : 18,
      duration: 2000,
      curve: 1.4,
      easing: (t) => t * (2 - t),
      isMobile,
    });
  }

  flyToRandomLocation(
    map: mapboxgl.Map,
    coordinates: { latitude: number; longitude: number },
    isMobile: boolean,
  ): Effect.Effect<void, MapNotReadyError, never> {
    return this.flyTo(map, {
      coordinates,
      zoom: isMobile ? 9 : 12,
      duration: 1500,
      curve: 1.2,
      easing: (t) => t * (2 - t),
      isMobile,
    });
  }
}

/**
 * Service tag for dependency injection
 */
export const MapNavigationService = Context.GenericTag<MapNavigationService>(
  "@services/MapNavigationService",
);

/**
 * Live layer implementation
 */
export const MapNavigationServiceLive = Layer.succeed(
  MapNavigationService,
  new MapNavigationServiceImpl(),
).pipe(Layer.tap(() => Effect.logDebug("🗺️  MapNavigationService initialized")));

/**
 * Test layer implementation
 *
 * Creates a mock layer for testing. Provide partial implementations of methods you need.
 * Any methods not provided will throw UnimplementedError when called.
 *
 * @example
 * ```typescript
 * const MapNavigationServiceTest = Layer.mock(MapNavigationService, {
 *   flyTo: () => Effect.void,
 *   flyToSearchResult: () => Effect.void,
 * });
 * ```
 */
export const MapNavigationServiceTest = Layer.mock(MapNavigationService, {
  flyTo: () => Effect.void,
  flyToSearchResult: () => Effect.void,
  flyToParking: () => Effect.void,
  flyToRandomLocation: () => Effect.void,
});

/**
 * Client-Friendly API (Adapter)
 *
 * Provides convenient promise-based methods without Effect boilerplate.
 * Use this in React components for simple, clean navigation calls.
 *
 * **Error Handling Pattern:**
 * - Default: Errors are silently logged (fire-and-forget)
 * - Custom: Pass errorHandler to customize behavior (e.g., toast)
 *
 * @example
 * ```typescript
 * import { mapNavigation } from "@/lib/services/map-navigation-service";
 *
 * // Fire-and-forget (default: silent logging)
 * mapNavigation.flyTo(map, {
 *   coordinates: { latitude: 1.3521, longitude: 103.8198 },
 *   zoom: 16,
 *   isMobile: false
 * });
 *
 * // Custom error handling (e.g., toast for user actions)
 * mapNavigation.flyToSearchResult(
 *   map,
 *   coords,
 *   isMobile,
 *   (error) => toast.error("Failed to navigate")
 * );
 * ```
 */
export const mapNavigation = {
  /**
   * Fly to a location with custom options
   *
   * @param errorHandler - Optional custom error handler (default: silent log)
   */
  flyTo: (
    map: mapboxgl.Map,
    options: FlyToOptions,
    errorHandler?: (error: unknown) => void,
  ): Promise<void> => {
    return runClientEffectAsync(
      Effect.gen(function* () {
        const mapNav = yield* MapNavigationService;
        yield* mapNav.flyTo(map, options);
      }),
    ).catch((error) => {
      if (errorHandler) {
        errorHandler(error);
      } else {
        logger.error("Map flyTo failed", error);
      }
    });
  },

  /**
   * Fly to a search result with optimized settings
   *
   * @param errorHandler - Optional custom error handler (default: silent log)
   */
  flyToSearchResult: (
    map: mapboxgl.Map,
    coordinates: { latitude: number; longitude: number },
    isMobile: boolean,
    errorHandler?: (error: unknown) => void,
  ): Promise<void> => {
    return runClientEffectAsync(
      Effect.gen(function* () {
        const mapNav = yield* MapNavigationService;
        yield* mapNav.flyToSearchResult(map, coordinates, isMobile);
      }),
    ).catch((error) => {
      if (errorHandler) {
        errorHandler(error);
      } else {
        logger.error("Map flyTo search result failed", error);
      }
    });
  },

  /**
   * Fly to a parking location with optimized settings
   *
   * @param errorHandler - Optional custom error handler (default: silent log)
   */
  flyToParking: (
    map: mapboxgl.Map,
    coordinates: { latitude: number; longitude: number },
    isMobile: boolean,
    errorHandler?: (error: unknown) => void,
  ): Promise<void> => {
    return runClientEffectAsync(
      Effect.gen(function* () {
        const mapNav = yield* MapNavigationService;
        yield* mapNav.flyToParking(map, coordinates, isMobile);
      }),
    ).catch((error) => {
      if (errorHandler) {
        errorHandler(error);
      } else {
        logger.error("Map flyTo parking failed", error);
      }
    });
  },

  /**
   * Fly to a random/saved location with optimized settings
   *
   * @param errorHandler - Optional custom error handler (default: silent log)
   */
  flyToRandomLocation: (
    map: mapboxgl.Map,
    coordinates: { latitude: number; longitude: number },
    isMobile: boolean,
    errorHandler?: (error: unknown) => void,
  ): Promise<void> => {
    return runClientEffectAsync(
      Effect.gen(function* () {
        const mapNav = yield* MapNavigationService;
        yield* mapNav.flyToRandomLocation(map, coordinates, isMobile);
      }),
    ).catch((error) => {
      if (errorHandler) {
        errorHandler(error);
      } else {
        logger.error("Map flyTo random location failed", error);
      }
    });
  },
};
