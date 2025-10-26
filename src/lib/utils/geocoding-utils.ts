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
 * Structured address components for more precise geocoding
 * Uses Mapbox Geocoding v6 structured input feature
 */
export interface StructuredAddress {
  /** Street number (e.g., "123") */
  streetNumber?: string;
  /** Street name (e.g., "Orchard Road") */
  streetName?: string;
  /** City (e.g., "Singapore", "Jakarta") */
  city?: string;
  /** State/region (e.g., "Central Region", "Jakarta Special Capital Region") */
  state?: string;
  /** Postal code (e.g., "238858", "10110") */
  postalCode?: string;
  /** Country code (ISO 3166-1 alpha-2, e.g., "SG", "ID") */
  country?: string;
}

/**
 * Geocode using structured address components (Mapbox Geocoding v6)
 * Provides more precise results when address components are well-organized
 *
 * @example
 * ```ts
 * const result = yield* geocodeStructuredAddress({
 *   streetNumber: "10",
 *   streetName: "Bayfront Avenue",
 *   city: "Singapore",
 *   postalCode: "018956",
 *   country: "SG"
 * }, mapboxToken);
 * ```
 */
export const geocodeStructuredAddress = (
  address: StructuredAddress,
  mapboxToken: string,
): Effect.Effect<GeocodedLocation | null, Error> =>
  Effect.gen(function* () {
    if (!mapboxToken) {
      yield* Effect.logWarning(
        "No Mapbox token provided for structured geocoding",
      );
      return null;
    }

    // Build structured query parameters for Mapbox Geocoding v6
    const params = new URLSearchParams();
    params.append("access_token", mapboxToken);
    params.append("limit", "1");

    // Construct address_line1 from street components
    const addressLine1Parts: string[] = [];
    if (address.streetNumber) addressLine1Parts.push(address.streetNumber);
    if (address.streetName) addressLine1Parts.push(address.streetName);
    if (addressLine1Parts.length > 0) {
      params.append("address_line1", addressLine1Parts.join(" "));
    }

    // Add other structured components
    if (address.city) params.append("place", address.city);
    if (address.state) params.append("region", address.state);
    if (address.postalCode) params.append("postcode", address.postalCode);
    if (address.country) params.append("country", address.country);

    const url = `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`;

    yield* Effect.log("Structured geocoding with v6 API", { address });

    const response = yield* Effect.tryPromise({
      try: () => fetch(url),
      catch: (error) =>
        new Error(`Structured geocoding fetch failed: ${error}`),
    });

    if (!response.ok) {
      yield* Effect.logWarning(
        `Structured geocoding failed: ${response.status}`,
      );
      return null;
    }

    const data: MapboxGeocodingResponse = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (error) =>
        new Error(`Structured geocoding parse failed: ${error}`),
    });

    if (data.features.length === 0) {
      yield* Effect.logWarning("No structured geocoding results");
      return null;
    }

    const [longitude, latitude] = data.features[0].center;
    const placeName = data.features[0].place_name;

    yield* Effect.log("Successfully geocoded structured address", {
      address,
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
 * Parse a combined address string into structured components
 * This is a helper for converting existing single-string addresses to structured format
 *
 * @example
 * ```ts
 * parseAddressString("10 Bayfront Avenue, Singapore 018956")
 * // Returns: { streetNumber: "10", streetName: "Bayfront Avenue", city: "Singapore", postalCode: "018956" }
 * ```
 */
export const parseAddressString = (
  addressString: string,
  defaultCountry?: string,
): StructuredAddress => {
  const parts = addressString.split(",").map((p) => p.trim());
  const address: StructuredAddress = {};

  // First part: street address
  if (parts[0]) {
    const streetMatch = parts[0].match(/^(\d+)\s+(.+)$/);
    if (streetMatch) {
      address.streetNumber = streetMatch[1];
      address.streetName = streetMatch[2];
    } else {
      address.streetName = parts[0];
    }
  }

  // Second part: city or state
  if (parts[1]) {
    address.city = parts[1];
  }

  // Third part: postal code or country
  if (parts[2]) {
    const postalMatch = parts[2].match(/\b(\d{4,6})\b/);
    if (postalMatch) {
      address.postalCode = postalMatch[1];
      // Remove postal code from remaining text to get city/state
      const remaining = parts[2].replace(postalMatch[0], "").trim();
      if (remaining && !address.city) {
        address.city = remaining;
      }
    } else {
      address.state = parts[2];
    }
  }

  if (defaultCountry) {
    address.country = defaultCountry;
  }

  return address;
};

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

/**
 * Reverse geocode coordinates to get a human-readable location name
 * Returns place name like "Marina Bay, Singapore" or "Central Jakarta, Indonesia"
 */
export const reverseGeocode = (
  latitude: number,
  longitude: number,
  mapboxToken: string,
): Effect.Effect<string | null, Error> =>
  Effect.gen(function* () {
    if (!mapboxToken) {
      yield* Effect.logWarning(
        "No Mapbox token provided for reverse geocoding",
      );
      return null;
    }

    // Mapbox reverse geocoding: longitude, latitude order
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}&types=place,locality,neighborhood,address&limit=1`;

    yield* Effect.log("Reverse geocoding coordinates", { latitude, longitude });

    const response = yield* Effect.tryPromise({
      try: () => fetch(url),
      catch: (error) => new Error(`Reverse geocoding fetch failed: ${error}`),
    });

    if (!response.ok) {
      yield* Effect.logWarning(`Reverse geocoding failed: ${response.status}`);
      return null;
    }

    const data: MapboxGeocodingResponse = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (error) => new Error(`Reverse geocoding parse failed: ${error}`),
    });

    if (data.features.length === 0) {
      yield* Effect.logWarning("No reverse geocoding results");
      return null;
    }

    const placeName = data.features[0].place_name;

    yield* Effect.log("Successfully reverse geocoded", {
      latitude,
      longitude,
      placeName,
    });

    return placeName;
  });
