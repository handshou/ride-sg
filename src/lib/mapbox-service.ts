import { Context, Effect, Layer } from "effect";
import { mapboxTokenConfig } from "./config-service";

/**
 * Mapbox Service Interface
 *
 * Provides geocoding and mapping functionality using Mapbox APIs
 * through the MCP (Model Context Protocol) integration.
 */
export interface MapboxService {
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
   * Get a static map image
   */
  getStaticMap(
    center: { longitude: number; latitude: number },
    zoom: number,
    size: { width: number; height: number },
  ): Effect.Effect<string, MapboxError>;
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
 * Mapbox service tag for dependency injection
 */
export const MapboxServiceTag =
  Context.GenericTag<MapboxService>("MapboxService");

/**
 * Live implementation of MapboxService using MCP
 */
export class MapboxServiceImpl implements MapboxService {
  forwardGeocode(
    query: string,
    limit: number = 5,
  ): Effect.Effect<GeocodeResult[], MapboxError> {
    return Effect.sync(() => {
      // This would normally call the MCP tool, but since we can't directly
      // call MCP tools from Effect programs, we'll simulate the response
      // In a real implementation, you'd need to bridge the MCP calls
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
      // Simulate reverse geocoding response
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
    return Effect.gen(function* () {
      const mapboxToken = yield* mapboxTokenConfig;

      const { longitude, latitude } = center;
      const { width, height } = size;

      const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${longitude},${latitude},${zoom}/${width}x${height}?access_token=${mapboxToken}`;
      return url;
    });
  }
}

/**
 * Live layer for MapboxService
 */
export const MapboxServiceLive = Layer.succeed(
  MapboxServiceTag,
  new MapboxServiceImpl(),
);

/**
 * Effect to get Singapore location data
 */
export const getSingaporeLocationEffect = (): Effect.Effect<
  GeocodeResult[],
  MapboxError,
  MapboxService
> => {
  return Effect.gen(function* () {
    const mapboxService = yield* MapboxServiceTag;
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
    const mapboxService = yield* MapboxServiceTag;
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
    const mapboxService = yield* MapboxServiceTag;
    const mapUrl = yield* mapboxService.getStaticMap(center, zoom, size);
    yield* Effect.log(`Generated static map URL: ${mapUrl}`);
    return mapUrl;
  });
};
