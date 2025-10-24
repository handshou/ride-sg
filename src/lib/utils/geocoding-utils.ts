import { Effect } from "effect";

/**
 * Mapbox Geocoding Response Types
 */
interface MapboxFeature {
  center: [number, number]; // [longitude, latitude]
  place_name: string;
  context?: Array<{ id: string; text: string }>;
}

interface MapboxGeocodingResponse {
  features: MapboxFeature[];
}

/**
 * Geocoded location result
 */
export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  placeName: string;
}

/**
 * Geocode a location name to coordinates using Mapbox
 * Biased towards Singapore results
 */
export const geocodeLocationName = (
  locationName: string,
  mapboxToken: string,
): Effect.Effect<GeocodedLocation | null, Error> =>
  Effect.gen(function* () {
    if (!locationName || !mapboxToken) {
      return null;
    }

    // Add Singapore bias to the query for better results
    const query = `${locationName} Singapore`;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=SG&limit=1`;

    yield* Effect.log("Geocoding location", { locationName, query });

    const response = yield* Effect.tryPromise({
      try: () => fetch(url),
      catch: (error) => new Error(`Geocoding fetch failed: ${error}`),
    });

    if (!response.ok) {
      yield* Effect.logWarning(
        `Geocoding failed for "${locationName}": ${response.status}`,
      );
      return null;
    }

    const data: MapboxGeocodingResponse = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (error) => new Error(`Geocoding parse failed: ${error}`),
    });

    if (data.features.length === 0) {
      yield* Effect.logWarning(`No geocoding results for "${locationName}"`);
      return null;
    }

    const [longitude, latitude] = data.features[0].center;
    const placeName = data.features[0].place_name;

    yield* Effect.log("Successfully geocoded location", {
      locationName,
      latitude,
      longitude,
      placeName,
    });

    return {
      latitude,
      longitude,
      placeName,
    };
  });

/**
 * Try geocoding multiple location names and return the first successful result
 */
export const geocodeFirstAvailable = (
  locationNames: string[],
  mapboxToken: string,
): Effect.Effect<GeocodedLocation | null, Error> =>
  Effect.gen(function* () {
    for (const name of locationNames) {
      if (!name || name.trim() === "") continue;

      const result = yield* geocodeLocationName(name, mapboxToken).pipe(
        Effect.catchAll(() => Effect.succeed(null)),
      );

      if (result !== null) {
        return result;
      }
    }

    yield* Effect.logWarning(
      "No geocoding results for any location",
      locationNames,
    );
    return null;
  });
