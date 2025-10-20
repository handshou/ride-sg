import { Effect, Layer } from "effect";
import { ConfigService } from "./services/config-service";
import { MapReadinessServiceLive } from "./services/map-readiness-service";
import {
  type GeocodeResult,
  getCurrentLocationEffect,
  getSingaporeLocationEffect,
  getStaticMapEffect,
  MapboxService,
} from "./services/mapbox-service";
import {
  showErrorToast,
  showWarningToast,
  ToastServiceLive,
} from "./services/toast-service";

/**
 * Next.js Server Component Runtime
 *
 * This runtime is specifically designed for Next.js server components
 * with proper Effect Context and dependency injection.
 *
 * Uses Effect.runSync directly to avoid Turbopack module resolution issues.
 */

// Combined layer with all services
// Note: Logger configuration removed to allow all logs in production for debugging
export const ServerLayer = Layer.mergeAll(
  ConfigService.Default,
  MapboxService.Default,
  ToastServiceLive,
  MapReadinessServiceLive,
);

/**
 * Run an Effect program in a Next.js server component context
 *
 * @param program - The Effect program to run
 * @returns The result of the Effect program
 */
export function runServerEffect<A, E, R>(program: Effect.Effect<A, E, R>): A {
  return Effect.runSync(
    program.pipe(Effect.provide(ServerLayer)) as Effect.Effect<A, E, never>,
  );
}

/**
 * Run an Effect program asynchronously in a Next.js server component context
 *
 * @param program - The Effect program to run
 * @returns Promise that resolves to the result of the Effect program
 */
export async function runServerEffectAsync<A, E, R>(
  program: Effect.Effect<A, E, R>,
): Promise<A> {
  return await Effect.runPromise(
    program.pipe(Effect.provide(ServerLayer)) as Effect.Effect<A, E, never>,
  );
}

/**
 * Helper function to get Singapore location data with proper context
 */
export const getSingaporeLocation = (): Effect.Effect<
  GeocodeResult[],
  never
> => {
  return getSingaporeLocationEffect().pipe(
    Effect.provide(ServerLayer),
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
 */
export const getCurrentLocation = (): Effect.Effect<GeocodeResult[], never> => {
  return getCurrentLocationEffect().pipe(
    Effect.provide(ServerLayer),
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
 */
export const getStaticMap = (
  center: { longitude: number; latitude: number },
  zoom: number = 12,
  size: { width: number; height: number } = { width: 400, height: 300 },
): Effect.Effect<string, never> => {
  return getStaticMapEffect(center, zoom, size).pipe(
    Effect.provide(ServerLayer),
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
 * Helper function to get random Singapore coordinates with proper context
 */
export const getRandomSingaporeCoords = (): Effect.Effect<
  { latitude: number; longitude: number },
  never
> => {
  return Effect.gen(function* () {
    const mapboxService = yield* MapboxService;
    return yield* mapboxService.getRandomSingaporeCoords();
  }).pipe(
    Effect.provide(ServerLayer),
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
 */
export const getMapboxPublicToken = (): Effect.Effect<string, never> => {
  return Effect.gen(function* () {
    const config = yield* ConfigService;
    return config.mapbox.publicToken;
  }).pipe(
    Effect.provide(ServerLayer),
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
