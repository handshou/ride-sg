import { Effect } from "effect";
import { getServerRuntime } from "../../instrumentation";
import { ConfigService } from "./services/config-service";
import {
  type GeocodeResult,
  getCurrentLocationEffect,
  getSingaporeLocationEffect,
  getStaticMapEffect,
  MapboxService,
} from "./services/mapbox-service";
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
