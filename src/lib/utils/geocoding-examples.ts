/**
 * Examples of using Mapbox Geocoding v6 Structured Input
 *
 * This file demonstrates the improved geocoding precision when using
 * structured address components instead of a single combined string.
 */

import { Effect } from "effect";
import {
  geocodeLocationName,
  geocodeStructuredAddress,
  parseAddressString,
  type StructuredAddress,
} from "./geocoding-utils";

/**
 * Example 1: Geocoding a Singapore address with structured input
 */
export const geocodeSingaporeStructuredExample = (mapboxToken: string) =>
  Effect.gen(function* () {
    // Using structured input for precise results
    const structuredAddress: StructuredAddress = {
      streetNumber: "10",
      streetName: "Bayfront Avenue",
      city: "Singapore",
      postalCode: "018956",
      country: "SG",
    };

    const result = yield* geocodeStructuredAddress(
      structuredAddress,
      mapboxToken,
    );

    if (result) {
      yield* Effect.log("Structured geocoding result (Singapore):", {
        placeName: result.placeName,
        latitude: result.latitude,
        longitude: result.longitude,
      });
    }

    return result;
  });

/**
 * Example 2: Geocoding a Jakarta address with structured input
 */
export const geocodeJakartaStructuredExample = (mapboxToken: string) =>
  Effect.gen(function* () {
    const structuredAddress: StructuredAddress = {
      streetName: "Jalan Thamrin",
      city: "Jakarta",
      state: "Jakarta Special Capital Region",
      postalCode: "10110",
      country: "ID",
    };

    const result = yield* geocodeStructuredAddress(
      structuredAddress,
      mapboxToken,
    );

    if (result) {
      yield* Effect.log("Structured geocoding result (Jakarta):", {
        placeName: result.placeName,
        latitude: result.latitude,
        longitude: result.longitude,
      });
    }

    return result;
  });

/**
 * Example 3: Parsing an existing address string to structured format
 */
export const parseAndGeocodeExample = (mapboxToken: string) =>
  Effect.gen(function* () {
    // Parse a combined address string
    const addressString = "10 Bayfront Avenue, Singapore, 018956";
    const parsed = parseAddressString(addressString, "SG");

    yield* Effect.log("Parsed address components:", parsed);

    // Use structured geocoding with parsed components
    const result = yield* geocodeStructuredAddress(parsed, mapboxToken);

    if (result) {
      yield* Effect.log("Geocoded from parsed address:", {
        placeName: result.placeName,
        latitude: result.latitude,
        longitude: result.longitude,
      });
    }

    return result;
  });

/**
 * Example 4: Comparison - Legacy vs Structured Geocoding
 */
export const compareGeocodingMethods = (mapboxToken: string) =>
  Effect.gen(function* () {
    const address = "10 Bayfront Avenue, Singapore 018956";

    // Method 1: Legacy single-string geocoding (v5)
    yield* Effect.log("Method 1: Legacy v5 single-string geocoding");
    const legacyResult = yield* geocodeLocationName(address, mapboxToken);

    if (legacyResult) {
      yield* Effect.log("Legacy result:", {
        placeName: legacyResult.placeName,
        latitude: legacyResult.latitude,
        longitude: legacyResult.longitude,
      });
    }

    // Method 2: Structured v6 geocoding
    yield* Effect.log("Method 2: Structured v6 geocoding");
    const parsed = parseAddressString(address, "SG");
    const structuredResult = yield* geocodeStructuredAddress(
      parsed,
      mapboxToken,
    );

    if (structuredResult) {
      yield* Effect.log("Structured result:", {
        placeName: structuredResult.placeName,
        latitude: structuredResult.latitude,
        longitude: structuredResult.longitude,
      });
    }

    // Compare precision
    if (legacyResult && structuredResult) {
      const distanceDiff = Math.sqrt(
        (legacyResult.latitude - structuredResult.latitude) ** 2 +
          (legacyResult.longitude - structuredResult.longitude) ** 2,
      );

      yield* Effect.log("Comparison:", {
        coordinateDifference: distanceDiff,
        message:
          distanceDiff < 0.001
            ? "Results are very close"
            : "Results have noticeable difference",
      });
    }

    return { legacyResult, structuredResult };
  });

/**
 * Example 5: Using structured input for better disambiguation
 *
 * When multiple locations have similar names, structured input helps
 * disambiguate by providing explicit context
 */
export const geocodeAmbiguousLocation = (mapboxToken: string) =>
  Effect.gen(function* () {
    // Without structured input, "Orchard Road" might match multiple locations
    // With structured input, we can be explicit
    const structuredAddress: StructuredAddress = {
      streetName: "Orchard Road",
      city: "Singapore",
      state: "Central Region",
      country: "SG",
    };

    const result = yield* geocodeStructuredAddress(
      structuredAddress,
      mapboxToken,
    );

    if (result) {
      yield* Effect.log("Disambiguated location:", {
        placeName: result.placeName,
        latitude: result.latitude,
        longitude: result.longitude,
      });
    }

    return result;
  });
