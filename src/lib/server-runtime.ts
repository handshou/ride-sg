import { Effect } from "effect";
import { getServerRuntime } from "../../instrumentation";
import {
  type RainfallReadingRecord,
  RainfallRepository,
} from "./repositories/rainfall-repository";
import { ConfigService } from "./services/config-service";
import {
  type GeocodeResult,
  getCurrentLocationEffect,
  getSingaporeLocationEffect,
  getStaticMapEffect,
  MapboxService,
} from "./services/mapbox-service";
import { RainfallService } from "./services/rainfall-service";
import { showErrorToast, showWarningToast } from "./services/toast-service";

/**
 * Next.js Server Component Runtime Helpers
 *
 * This module provides helper functions to run Effect programs in server contexts
 * using the managed runtime initialized in instrumentation.ts.
 *
 * The managed runtime is created ONCE at server startup, providing:
 * - Better performance (no per-request runtime creation)
 * - Proper resource lifecycle management
 * - Consistent service availability
 *
 * @see instrumentation.ts for runtime initialization
 */

/**
 * Run an Effect program synchronously in a Next.js server component context
 *
 * Uses the managed server runtime initialized at startup.
 * The runtime automatically provides all server-side services.
 *
 * Type-safe: Accepts any Effect program. The runtime will provide required services
 * or fail at runtime if a service is missing from ServerLayer.
 *
 * Only safe once the runtime layer has been built (instrumentation.ts awaits
 * this on startup). The PostgreSQL adapter connects asynchronously, so in
 * development the first request can reach here before the layer is ready.
 * Server components should prefer runServerEffectAsync.
 *
 * @param program - The Effect program to run
 * @returns The result of the Effect program
 *
 * @example
 * ```typescript
 * const data = runServerEffect(
 *   Effect.gen(function* () {
 *     const mapbox = yield* MapboxService;
 *     return yield* mapbox.forwardGeocode("Singapore");
 *   })
 * );
 * ```
 */
export function runServerEffect<A, E, R>(program: Effect.Effect<A, E, R>): A {
  const runtime = getServerRuntime();
  return runtime.runSync(program) as A;
}

/**
 * Run an Effect program asynchronously in a Next.js server component context
 *
 * Uses the managed server runtime initialized at startup.
 * The runtime automatically provides all server-side services.
 *
 * Type-safe: Accepts any Effect program. The runtime will provide required services
 * or fail at runtime if a service is missing from ServerLayer.
 *
 * @param program - The Effect program to run
 * @returns Promise that resolves to the result of the Effect program
 *
 * @example
 * ```typescript
 * const data = await runServerEffectAsync(
 *   Effect.gen(function* () {
 *     const rainfall = yield* RainfallService;
 *     return yield* rainfall.fetchRainfallData();
 *   })
 * );
 * ```
 */
export async function runServerEffectAsync<A, E, R>(
  program: Effect.Effect<A, E, R>,
): Promise<A> {
  const runtime = getServerRuntime();
  return await runtime.runPromise(program);
}

/**
 * Helper function to get Singapore location data with proper context
 *
 * This helper uses the managed runtime automatically.
 * No need to manually provide layers - the runtime handles it.
 *
 * Note: Returns Effect<T, E, never> because the runtime provides all required services.
 * This makes it type-safe to use with runServerEffect/runServerEffectAsync.
 */
export const getSingaporeLocation = () => {
  return getSingaporeLocationEffect().pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError("Failed to get Singapore locations", error);
        yield* showWarningToast(
          "Singapore locations service unavailable - using fallback data",
        );
        return [] as GeocodeResult[];
      }),
    ),
  );
};

/**
 * Helper function to get current location data with proper context
 *
 * This helper uses the managed runtime automatically.
 *
 * Note: Returns Effect<T, E, never> because the runtime provides all required services.
 */
export const getCurrentLocation = () => {
  return getCurrentLocationEffect().pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError("Failed to get current location", error);
        yield* showWarningToast(
          "Current location service unavailable - using fallback data",
        );
        return [] as GeocodeResult[];
      }),
    ),
  );
};

/**
 * Helper function to get static map URL with proper context
 *
 * This helper uses the managed runtime automatically.
 *
 * Note: Returns Effect<T, E, never> because the runtime provides all required services.
 */
export const getStaticMap = (
  center: { longitude: number; latitude: number },
  zoom: number = 12,
  size: { width: number; height: number } = { width: 400, height: 300 },
) => {
  return getStaticMapEffect(center, zoom, size).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError("Failed to generate static map", error);
        yield* showErrorToast(
          "Map service unavailable - showing placeholder image",
        );
        return "https://via.placeholder.com/400x300?text=Map+Not+Available";
      }),
    ),
  );
};

/**
 * Helper function to get Singapore center coordinates with proper context
 *
 * This helper uses the managed runtime automatically.
 *
 * Note: Returns Effect<T, E, never> because the runtime provides all required services.
 */
export const getSingaporeCenterCoords = () => {
  return Effect.gen(function* () {
    const mapboxService = yield* MapboxService;
    return yield* mapboxService.getSingaporeCenterCoords();
  }).pipe(
    Effect.orDie, // This should never fail as it's a constant value
  );
};

/**
 * Helper function to get Jakarta center coordinates with proper context
 *
 * This helper uses the managed runtime automatically.
 *
 * Note: Returns Effect<T, E, never> because the runtime provides all required services.
 */
export const getJakartaCenterCoords = () => {
  return Effect.gen(function* () {
    const mapboxService = yield* MapboxService;
    return yield* mapboxService.getJakartaCenterCoords();
  }).pipe(
    Effect.orDie, // This should never fail as it's a constant value
  );
};

/**
 * Helper function to get random Singapore coordinates with proper context
 *
 * This helper uses the managed runtime automatically.
 *
 * Note: Returns Effect<T, E, never> because the runtime provides all required services.
 */
export const getRandomSingaporeCoords = () => {
  return Effect.gen(function* () {
    const mapboxService = yield* MapboxService;
    return yield* mapboxService.getRandomSingaporeCoords();
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError("Failed to get random coordinates", error);
        yield* showWarningToast(
          "Random coordinates service unavailable - using Marina Bay coordinates",
        );
        return {
          latitude: 1.351616,
          longitude: 103.808053,
        };
      }),
    ),
  );
};

/**
 * Helper function to get Mapbox public token for client-side use
 *
 * This helper uses the managed runtime automatically.
 *
 * Note: Returns Effect<T, E, never> because the runtime provides all required services.
 */
export const getMapboxPublicToken = () => {
  return Effect.gen(function* () {
    const config = yield* ConfigService;
    return config.mapbox.publicToken;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError("Failed to get Mapbox public token", error);
        yield* showWarningToast(
          "Mapbox public token unavailable - using fallback",
        );
        return "pk.test";
      }),
    ),
  );
};

/**
 * Rainfall reading data structure
 */
export type RainfallReading = RainfallReadingRecord;

/**
 * Helper function to get rainfall data with NEA API first and the
 * RainfallRepository as fallback.
 *
 * Strategy:
 * 1. Fetch fresh data from NEA API using RainfallService
 * 2. On success, upsert the batch into RainfallRepository (non-fatal). The
 *    store keeps one row per station and skips rows whose NEA reading
 *    timestamp is unchanged, so renders between NEA updates cost no writes.
 * 3. If NEA API fails, read the latest snapshot from RainfallRepository
 * 4. Return empty array if both fail
 */
export const getRainfallData = () => {
  return Effect.gen(function* () {
    yield* Effect.log("Fetching rainfall data (NEA API, repository fallback)");

    // Try NEA API first
    const rainfallService = yield* RainfallService;
    const neaResult = yield* rainfallService.fetchRainfallData().pipe(
      Effect.andThen((response) =>
        Effect.gen(function* () {
          // Process NEA response into the format we need
          const stations = response.data.stations;
          const readings = response.data.readings;

          if (readings.length === 0) {
            return yield* Effect.fail({
              _tag: "EmptyData" as const,
              message: "No readings available from NEA",
            });
          }

          // Create station lookup map
          const stationMap = new Map(
            stations.map((s) => [
              s.id,
              {
                name: s.name,
                latitude: s.location.latitude,
                longitude: s.location.longitude,
              },
            ]),
          );

          // Get latest reading set
          const latestReading = readings[0];
          const timestamp = latestReading.timestamp;
          const fetchedAt = Date.now();

          // Process readings
          const processedReadings: RainfallReading[] = latestReading.data
            .map((reading) => {
              const station = stationMap.get(reading.stationId);
              if (!station) return null;

              return {
                stationId: reading.stationId,
                stationName: station.name,
                latitude: station.latitude,
                longitude: station.longitude,
                value: reading.value,
                timestamp: timestamp,
                fetchedAt: fetchedAt,
              };
            })
            .filter((r): r is RainfallReading => r !== null);

          yield* Effect.log(
            `Successfully fetched ${processedReadings.length} readings from NEA API`,
          );

          // Write through to the fallback store; never fail the request on it
          const repository = yield* RainfallRepository;
          const changedStations = yield* repository
            .saveReadings(processedReadings)
            .pipe(
              Effect.catchAll((error) =>
                Effect.logWarning(
                  "Failed to persist rainfall readings to repository",
                  error,
                ).pipe(Effect.as(0)),
              ),
            );
          if (changedStations > 0) {
            yield* Effect.log(
              `Rainfall snapshot updated for ${changedStations} stations`,
            );
          }

          return processedReadings;
        }),
      ),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.logWarning(
            "NEA API fetch failed, trying repository fallback",
            error,
          );
          return yield* Effect.fail(error);
        }),
      ),
    );

    return neaResult;
  }).pipe(
    Effect.catchAll(() =>
      Effect.gen(function* () {
        yield* Effect.log(
          "Falling back to RainfallRepository for rainfall data",
        );

        const repository = yield* RainfallRepository;
        const fallbackData = yield* repository
          .getLatestReadings()
          .pipe(
            Effect.catchAll((error) =>
              Effect.logError(
                "Rainfall repository fallback also failed, returning empty array",
                error,
              ).pipe(Effect.as([] as ReadonlyArray<RainfallReading>)),
            ),
          );

        yield* Effect.log(
          `Retrieved ${fallbackData.length} readings from repository (fallback)`,
        );

        return [...fallbackData];
      }),
    ),
  );
};
