import { Context, Effect, Layer } from "effect";
import type mapboxgl from "mapbox-gl";
import {
  type DetectedCity,
  detectCityFromCoords,
} from "../utils/detect-location";

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
 * Implementation of CrossBorderNavigationService
 */
export class CrossBorderNavigationServiceImpl
  implements CrossBorderNavigationService
{
  /**
   * Constants for cross-border navigation
   */
  private readonly LOCAL_FLY_DURATION = 1800; // 1.8 seconds
  private readonly CROSS_BORDER_FLY_DURATION = 6000; // 6 seconds
  private readonly LOCAL_CURVE = 1.3;
  private readonly CROSS_BORDER_CURVE = 1.8; // More dramatic arc
  private readonly URL_UPDATE_BUFFER = 200; // ms after flyTo completes

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

        // Check if detected city is different from current city
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
    const crossBorderCurve = this.CROSS_BORDER_CURVE;
    const localCurve = this.LOCAL_CURVE;

    return Effect.gen(function* () {
      // Check if map is ready
      if (!map || !map.isStyleLoaded()) {
        return yield* Effect.fail(
          new MapNotReadyError("Map is not ready for flyTo animation"),
        );
      }

      yield* Effect.logInfo(
        `FlyTo starting: ${coordinates.latitude}, ${coordinates.longitude} (duration: ${duration}ms)`,
      );

      // Execute flyTo in a promise that resolves after animation
      yield* Effect.promise(
        () =>
          new Promise<void>((resolve) => {
            map.stop(); // Stop any ongoing animations

            requestAnimationFrame(() => {
              const zoom = isMobile ? 15 : 16;
              const curve = isCrossBorder ? crossBorderCurve : localCurve;

              map.flyTo({
                center: [coordinates.longitude, coordinates.latitude],
                zoom,
                duration,
                essential: true,
                curve,
                easing: (t) => t * (2 - t),
              });

              // Resolve after animation completes
              setTimeout(resolve, duration);
            });
          }),
      );

      yield* Effect.logInfo("FlyTo animation completed");
    });
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

    const detectCrossBorderFn = this.detectCrossBorder.bind(this);
    const executeFlyToFn = this.executeFlyTo.bind(this);
    const updateUrlFn = this.updateUrlWithoutNavigation.bind(this);

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
    );
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
 */
export const CrossBorderNavigationServiceLive = Layer.succeed(
  CrossBorderNavigationServiceTag,
  new CrossBorderNavigationServiceImpl(),
).pipe(
  Layer.tap(() =>
    Effect.logDebug("🗺️  CrossBorderNavigationService initialized"),
  ),
);
