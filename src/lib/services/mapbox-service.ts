import { Effect } from "effect";
import type { AppConfig } from "./config-service";
import { ConfigService } from "./config-service";

/**
 * Mapbox Service Interface (for legacy compatibility)
 */
export interface IMapboxService {
  /**
   * Forward geocode an address to coordinates
   */
  forwardGeocode(
    query: string,
    limit?: number,
  ): Effect.Effect<GeocodeResult[], MapboxError>;

  /**
   * Reverse geocode coordinates to address
   */
  reverseGeocode(
    longitude: number,
    latitude: number,
    limit?: number,
  ): Effect.Effect<GeocodeResult[], MapboxError>;

  /**
   * Get a static map image URL
   */
  getStaticMap(
    center: { longitude: number; latitude: number },
    zoom: number,
    size: { width: number; height: number },
  ): Effect.Effect<string, MapboxError>;

  /**
   * Generate random coordinates within Singapore bounds
   */
  getRandomSingaporeCoords(): Effect.Effect<
    { latitude: number; longitude: number },
    never
  >;

  /**
   * Get Singapore's geographic center coordinates
   */
  getSingaporeCenterCoords(): Effect.Effect<
    { latitude: number; longitude: number },
    never
  >;
}

/**
 * Geocode result from Mapbox API
 */
export interface GeocodeResult {
  address: string;
  coordinates: {
    longitude: number;
    latitude: number;
  };
  type: string;
}

/**
 * Mapbox service error
 */
export class MapboxError {
  constructor(
    public readonly message: string,
    public readonly cause?: unknown,
  ) {}
}

/**
 * Implementation of MapboxService
 */
class MapboxServiceImpl {
  constructor(private readonly config: AppConfig) {}

  forwardGeocode(
    query: string,
    limit: number = 5,
  ): Effect.Effect<GeocodeResult[], MapboxError> {
    return Effect.sync(() => {
      // Mock implementation - will be replaced with real API calls in Phase 4
      // Currently not used in production (Exa handles geocoding)
      const mockResults: GeocodeResult[] = [
        {
          address: `${query} (Singapore)`,
          coordinates: { longitude: 103.808053, latitude: 1.351616 },
          type: "place",
        },
      ];
      return mockResults.slice(0, limit);
    });
  }

  reverseGeocode(
    longitude: number,
    latitude: number,
    limit: number = 1,
  ): Effect.Effect<GeocodeResult[], MapboxError> {
    return Effect.sync(() => {
      // Mock implementation - will be replaced with real API calls in Phase 4
      // Currently not used in production
      const mockResults: GeocodeResult[] = [
        {
          address: `Location at ${longitude}, ${latitude}`,
          coordinates: { longitude, latitude },
          type: "address",
        },
      ];
      return mockResults.slice(0, limit);
    });
  }

  getStaticMap(
    center: { longitude: number; latitude: number },
    zoom: number,
    size: { width: number; height: number },
  ): Effect.Effect<string, MapboxError> {
    return Effect.sync(() => {
      const { longitude, latitude } = center;
      const { width, height } = size;

      const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${longitude},${latitude},${zoom}/${width}x${height}?access_token=${this.config.mapbox.token}`;
      return url;
    });
  }

  getRandomSingaporeCoords(): Effect.Effect<
    { latitude: number; longitude: number },
    never
  > {
    return Effect.sync(() => {
      // Singapore approximate bounds: 1.16°N to 1.47°N, 103.6°E to 104.0°E
      const minLat = 1.16;
      const maxLat = 1.47;
      const minLng = 103.6;
      const maxLng = 104.0;

      return {
        latitude: minLat + Math.random() * (maxLat - minLat),
        longitude: minLng + Math.random() * (maxLng - minLng),
      };
    });
  }

  getSingaporeCenterCoords(): Effect.Effect<
    { latitude: number; longitude: number },
    never
  > {
    return Effect.succeed({
      latitude: 1.3521,
      longitude: 103.8198,
    });
  }
}

/**
 * MapboxService as Effect.Service
 * Provides auto-generated accessors and cleaner DI
 */
export class MapboxService extends Effect.Service<MapboxService>()(
  "MapboxService",
  {
    effect: Effect.gen(function* () {
      const config = yield* ConfigService;
      return new MapboxServiceImpl(config);
    }),
    dependencies: [ConfigService.Default],
  },
) {}

/**
 * Effect to get Singapore location data
 */
export const getSingaporeLocationEffect = (): Effect.Effect<
  GeocodeResult[],
  MapboxError,
  MapboxService
> => {
  return Effect.gen(function* () {
    const mapboxService = yield* MapboxService;
    const results = yield* mapboxService.forwardGeocode("Singapore", 3);
    yield* Effect.log(`Found ${results.length} locations for Singapore`);
    return results;
  });
};

/**
 * Effect to get current location data (simulated)
 */
export const getCurrentLocationEffect = (): Effect.Effect<
  GeocodeResult[],
  MapboxError,
  MapboxService
> => {
  return Effect.gen(function* () {
    const mapboxService = yield* MapboxService;
    // Simulate current location in Singapore
    const results = yield* mapboxService.reverseGeocode(
      103.808053,
      1.351616,
      1,
    );
    yield* Effect.log(`Found current location: ${results[0]?.address}`);
    return results;
  });
};

/**
 * Effect to generate a static map URL
 */
export const getStaticMapEffect = (
  center: { longitude: number; latitude: number },
  zoom: number = 12,
  size: { width: number; height: number } = { width: 400, height: 300 },
): Effect.Effect<string, MapboxError, MapboxService> => {
  return Effect.gen(function* () {
    const mapboxService = yield* MapboxService;
    const mapUrl = yield* mapboxService.getStaticMap(center, zoom, size);
    yield* Effect.log(`Generated static map URL: ${mapUrl}`);
    return mapUrl;
  });
};

/**
 * Legacy export for MapboxServiceTag (for backwards compatibility during migration)
 * This will be removed once all services are migrated
 */
import { Context } from "effect";
export const MapboxServiceTag =
  Context.GenericTag<IMapboxService>("MapboxService");
