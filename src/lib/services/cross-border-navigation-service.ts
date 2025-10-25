import { Context, Effect, Layer } from "effect";
import type mapboxgl from "mapbox-gl";
import {
  type DetectedCity,
  detectCityFromCoords,
} from "../utils/detect-location";
import { MapNavigationService } from "./map-navigation-service";

/**
 * Supported cities for cross-border navigation
 */
export type SupportedCity = "singapore" | "jakarta";

/**
 * Options for handling location detection
 */
export interface LocationFoundOptions {
  coordinates: { latitude: number; longitude: number };
  currentCity: SupportedCity;
  map: mapboxgl.Map;
  mapboxToken: string;
  isMobile: boolean;
}

/**
 * Result of location detection and navigation
 */
export interface NavigationResult {
  detectedCity: DetectedCity;
  isCrossBorder: boolean;
  flyToDuration: number;
  urlUpdated: boolean;
}

/**
 * Error types for cross-border navigation
 */
export class CrossBorderNavigationError {
  readonly _tag = "CrossBorderNavigationError";
  constructor(
    public readonly message: string,
    public readonly cause?: unknown,
  ) {}
}

export class MapNotReadyError {
  readonly _tag = "MapNotReadyError";
  constructor(public readonly message: string) {}
}

export class CityDetectionError {
  readonly _tag = "CityDetectionError";
  constructor(
    public readonly message: string,
    public readonly cause?: unknown,
  ) {}
}

/**
 * CrossBorderNavigationService Interface
 *
 * Handles intelligent cross-border navigation between cities:
 * - Detects user's city from coordinates
 * - Animates map flyTo with appropriate duration
 * - Updates URL without triggering page navigation
 * - Provides proper error handling and logging
 */
export interface CrossBorderNavigationService {
  /**
   * Handle location found event with cross-border detection
   *
   * This method:
   * 1. Detects which city the coordinates are in
   * 2. Animates the map to fly to the location
   * 3. If cross-border, updates the URL after animation completes
   *
   * @param options - Location and map configuration
   * @returns Effect with navigation result or error
   */
  handleLocationFound(
    options: LocationFoundOptions,
  ): Effect.Effect<
    NavigationResult,
    CrossBorderNavigationError | MapNotReadyError | CityDetectionError,
    never
  >;

  /**
   * Detect if coordinates are in a different city than current
   *
   * @param coordinates - User's location
   * @param currentCity - Current city page
   * @param mapboxToken - Mapbox access token
   * @returns Effect with detection result
   */
  detectCrossBorder(
    coordinates: { latitude: number; longitude: number },
    currentCity: SupportedCity,
    mapboxToken: string,
  ): Effect.Effect<
    { detectedCity: DetectedCity; isCrossBorder: boolean },
    CityDetectionError,
    never
  >;

  /**
   * Execute flyTo animation on map
   *
   * @param map - Mapbox map instance
   * @param coordinates - Target coordinates
   * @param duration - Animation duration in milliseconds
   * @param isCrossBorder - Whether this is a cross-border flight
   * @param isMobile - Mobile device flag
   * @returns Effect that completes after flyTo
   */
  executeFlyTo(
    map: mapboxgl.Map,
    coordinates: { latitude: number; longitude: number },
    duration: number,
    isCrossBorder: boolean,
    isMobile: boolean,
  ): Effect.Effect<void, MapNotReadyError, never>;

  /**
   * Update browser URL without triggering navigation
   *
   * @param targetCity - City to navigate to
   * @returns Effect with success/failure
   */
  updateUrlWithoutNavigation(
    targetCity: SupportedCity,
  ): Effect.Effect<void, CrossBorderNavigationError, never>;
}

/**
 * Extract the actual service shape from the tag
 */
type MapNavigationServiceShape = Context.Tag.Service<
  typeof MapNavigationService
>;

/**
 * Implementation of CrossBorderNavigationService
 */
export class CrossBorderNavigationServiceImpl
  implements CrossBorderNavigationService
{
  /**
   * Constants for cross-border navigation
   */
  private readonly LOCAL_FLY_DURATION = 2500; // 2.5 seconds
  private readonly CROSS_BORDER_FLY_DURATION = 6500; // 6.5 seconds
  private readonly LOCAL_CURVE = 1.6;
  private readonly CROSS_BORDER_CURVE = 1.8; // More dramatic arc
  private readonly URL_UPDATE_BUFFER = 200; // ms after flyTo completes

  /**
   * Constructor injection of dependencies
   * @param mapNavigationService - Injected map navigation service
   */
  constructor(
    private readonly mapNavigationService: MapNavigationServiceShape,
  ) {}

  detectCrossBorder(
    coordinates: { latitude: number; longitude: number },
    currentCity: SupportedCity,
    mapboxToken: string,
  ): Effect.Effect<
    { detectedCity: DetectedCity; isCrossBorder: boolean },
    CityDetectionError,
    never
  > {
    return Effect.tryPromise({
      try: async () => {
        const detectedCity = await detectCityFromCoords(
          coordinates.latitude,
          coordinates.longitude,
          mapboxToken,
        );

        // Cross-border definition:
        // - On /singapore page: flying to Jakarta coords = cross-border (6.5s)
        // - On /singapore page: flying to Singapore coords = local (2.5s)
        // - On /jakarta page: flying to Singapore coords = cross-border (6.5s)
        // - On /jakarta page: flying to Jakarta coords = local (2.5s)
        // - Unknown locations are treated as local to avoid long animations
        const isCrossBorder =
          (currentCity === "singapore" && detectedCity === "jakarta") ||
          (currentCity === "jakarta" && detectedCity === "singapore");

        return { detectedCity, isCrossBorder };
      },
      catch: (error) =>
        new CityDetectionError("Failed to detect city from coordinates", error),
    }).pipe(
      Effect.tap((result) =>
        Effect.logInfo(
          `City detection: ${result.detectedCity} (cross-border: ${result.isCrossBorder})`,
        ),
      ),
    );
  }

  executeFlyTo(
    map: mapboxgl.Map,
    coordinates: { latitude: number; longitude: number },
    duration: number,
    isCrossBorder: boolean,
    isMobile: boolean,
  ): Effect.Effect<void, MapNotReadyError, never> {
    const curve = isCrossBorder ? this.CROSS_BORDER_CURVE : this.LOCAL_CURVE;
    const zoom = isMobile ? 15 : 16;

    // Log for debugging
    return Effect.gen(function* () {
      yield* Effect.logInfo(
        `Flying to: duration=${duration}ms, curve=${curve}, isCrossBorder=${isCrossBorder}, zoom=${zoom}`,
      );
      return yield* Effect.void;
    }).pipe(
      Effect.flatMap(() =>
        // Use injected mapNavigationService directly (no yield needed)
        this.mapNavigationService.flyTo(map, {
          coordinates,
          zoom,
          duration,
          curve,
          easing: (t) => t * (2 - t),
          isMobile,
        }),
      ),
    );
  }

  updateUrlWithoutNavigation(
    targetCity: SupportedCity,
  ): Effect.Effect<void, CrossBorderNavigationError, never> {
    return Effect.try({
      try: () => {
        const targetPath = `/${targetCity}`;
        window.history.replaceState(null, "", targetPath);
        return Effect.logInfo(`URL updated to ${targetPath} (no rerender)`);
      },
      catch: (error) =>
        new CrossBorderNavigationError(
          `Failed to update URL to ${targetCity}`,
          error,
        ),
    }).pipe(Effect.flatten);
  }

  handleLocationFound(
    options: LocationFoundOptions,
  ): Effect.Effect<
    NavigationResult,
    CrossBorderNavigationError | MapNotReadyError | CityDetectionError,
    never
  > {
    const { coordinates, currentCity, map, mapboxToken, isMobile } = options;
    const crossBorderDuration = this.CROSS_BORDER_FLY_DURATION;
    const localDuration = this.LOCAL_FLY_DURATION;
    const urlBuffer = this.URL_UPDATE_BUFFER;

    // Explicitly type the bound functions to preserve `never` in Requirements
    const detectCrossBorderFn: (
      coords: { latitude: number; longitude: number },
      city: SupportedCity,
      token: string,
    ) => Effect.Effect<
      { detectedCity: DetectedCity; isCrossBorder: boolean },
      CityDetectionError,
      never
    > = this.detectCrossBorder.bind(this);

    const executeFlyToFn: (
      m: mapboxgl.Map,
      coords: { latitude: number; longitude: number },
      duration: number,
      isCrossBorder: boolean,
      isMobile: boolean,
    ) => Effect.Effect<void, MapNotReadyError, never> =
      this.executeFlyTo.bind(this);

    const updateUrlFn: (
      targetCity: SupportedCity,
    ) => Effect.Effect<void, CrossBorderNavigationError, never> =
      this.updateUrlWithoutNavigation.bind(this);

    return Effect.gen(function* () {
      // Step 1: Detect which city the user is in
      const detection = yield* detectCrossBorderFn(
        coordinates,
        currentCity,
        mapboxToken,
      );

      const { detectedCity, isCrossBorder } = detection;

      // Step 2: Determine animation duration
      const flyToDuration = isCrossBorder ? crossBorderDuration : localDuration;

      // Step 3: Execute flyTo animation
      yield* executeFlyToFn(
        map,
        coordinates,
        flyToDuration,
        isCrossBorder,
        isMobile,
      );

      // Step 4: Update URL if cross-border (after animation completes)
      let urlUpdated = false;
      if (isCrossBorder) {
        const targetCity =
          detectedCity === "singapore" ? "singapore" : "jakarta";

        yield* Effect.logInfo(
          `Cross-border detected! Updating URL to /${targetCity}`,
        );

        // Wait for animation to complete plus small buffer
        yield* Effect.sleep(urlBuffer);

        // Map error to CityDetectionError to match error type union
        yield* updateUrlFn(targetCity).pipe(
          Effect.mapError(
            (err) =>
              new CityDetectionError(
                "Failed to update URL after cross-border navigation",
                err,
              ),
          ),
        );
        urlUpdated = true;
        yield* Effect.logInfo(`URL updated successfully to /${targetCity}`);
      } else {
        yield* Effect.logInfo(
          `Local navigation (no cross-border), staying on current page`,
        );
      }

      return {
        detectedCity,
        isCrossBorder,
        flyToDuration,
        urlUpdated,
      };
    }).pipe(
      Effect.tapError((error) =>
        Effect.logError(
          `Cross-border navigation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          error,
        ),
      ),
    ) as Effect.Effect<
      NavigationResult,
      CrossBorderNavigationError | MapNotReadyError | CityDetectionError,
      never
    >;
  }
}

/**
 * Service tag for dependency injection
 */
export const CrossBorderNavigationServiceTag =
  Context.GenericTag<CrossBorderNavigationService>(
    "CrossBorderNavigationService",
  );

/**
 * Live layer implementation
 *
 * Uses Layer.effect to inject MapNavigationService dependency into the constructor.
 */
export const CrossBorderNavigationServiceLive = Layer.effect(
  CrossBorderNavigationServiceTag,
  Effect.gen(function* () {
    const mapNavService = yield* MapNavigationService;
    yield* Effect.logDebug("🗺️  CrossBorderNavigationService initialized");
    return new CrossBorderNavigationServiceImpl(mapNavService);
  }),
);

/**
 * Test layer implementation
 *
 * Creates a mock layer for testing with MapNavigationService dependency satisfied.
 * Provide partial implementations of methods you need for testing.
 * Any methods not provided will throw UnimplementedError when called.
 *
 * @example
 * ```typescript
 * // Use with all dependencies provided
 * const program = myTest.pipe(Effect.provide(CrossBorderNavigationServiceTest));
 *
 * // Or override specific methods
 * const CustomTest = Layer.mock(CrossBorderNavigationServiceTag, {
 *   handleLocationFound: (options) => Effect.succeed({
 *     detectedCity: "singapore",
 *     isCrossBorder: false,
 *     flyToDuration: 1800,
 *     urlUpdated: false,
 *   }),
 * }).pipe(Layer.provide(MapNavigationServiceTest));
 * ```
 */
export const CrossBorderNavigationServiceTest = Layer.mock(
  CrossBorderNavigationServiceTag,
  {
    handleLocationFound: () =>
      Effect.succeed({
        detectedCity: "singapore" as const,
        isCrossBorder: false,
        flyToDuration: 2500,
        urlUpdated: false,
      }),
    detectCrossBorder: () =>
      Effect.succeed({
        detectedCity: "singapore" as const,
        isCrossBorder: false,
      }),
    executeFlyTo: () => Effect.void,
    updateUrlWithoutNavigation: () => Effect.void,
  },
).pipe(Layer.provide(Layer.mock(MapNavigationService, {})));
