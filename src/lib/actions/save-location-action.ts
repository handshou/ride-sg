"use server";

import { ConvexHttpClient } from "convex/browser";
import { Effect } from "effect";
import { api } from "../../../convex/_generated/api";
import { runServerEffectAsync } from "../server-runtime";
import type { SearchResult } from "../services/search-state-service";
import { detectCityFromCoords } from "../utils/detect-location";

/**
 * Effect program for saving a location to Convex
 */
const saveLocationEffect = (result: SearchResult) =>
  Effect.gen(function* () {
    const deployment = process.env.NEXT_PUBLIC_CONVEX_URL;

    if (!deployment) {
      yield* Effect.logError("NEXT_PUBLIC_CONVEX_URL not configured");
      return {
        success: false,
        error: "Convex not configured. Run 'npx convex dev' first.",
      };
    }

    yield* Effect.log(`Connecting to Convex: ${deployment}`);
    const client = new ConvexHttpClient(deployment);

    // Add timeout wrapper for Convex operations
    const withTimeout = <T>(
      promise: Promise<T>,
      timeoutMs = 10000,
    ): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
            timeoutMs,
          ),
        ),
      ]);
    };

    // Detect city from coordinates
    yield* Effect.log(
      `Detecting city for: [${result.location.latitude}, ${result.location.longitude}]`,
    );
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!mapboxToken) {
      yield* Effect.logError("NEXT_PUBLIC_MAPBOX_TOKEN not configured");
      return {
        success: false,
        error: "Mapbox token not configured",
      };
    }

    const detectedCity = yield* Effect.tryPromise({
      try: () =>
        detectCityFromCoords(
          result.location.latitude,
          result.location.longitude,
          mapboxToken,
        ),
      catch: (error) => ({
        _tag: "CityDetectionError" as const,
        message: `Failed to detect city: ${error}`,
      }),
    });

    // Default to singapore if unknown
    const city =
      detectedCity === "singapore" || detectedCity === "jakarta"
        ? detectedCity
        : "singapore";
    yield* Effect.log(`Detected city: ${city}`);

    // First, search for existing results with similar titles (with timeout)
    yield* Effect.log(`Searching for existing results: "${result.title}"`);
    const existingResults = yield* Effect.tryPromise({
      try: () =>
        withTimeout(
          client.query(api.locations.searchLocations, {
            query: result.title,
            city, // Filter by city
          }),
          10000,
        ),
      catch: (error) => ({
        _tag: "ConvexError" as const,
        message: `Failed to search: ${error}`,
      }),
    });

    // Delete any existing results that match closely (to override)
    if (existingResults.length > 0) {
      yield* Effect.log(
        `Found ${existingResults.length} existing results, will override...`,
      );

      for (const existing of existingResults) {
        // Check if titles are very similar (case-insensitive match)
        const titleMatch =
          existing.title.toLowerCase().trim() ===
          result.title.toLowerCase().trim();

        if (titleMatch) {
          yield* Effect.tryPromise({
            try: () =>
              withTimeout(
                client.mutation(api.locations.deleteLocation, {
                  id: existing._id,
                }),
                10000,
              ),
            catch: (error) => ({
              _tag: "ConvexError" as const,
              message: `Failed to delete: ${error}`,
            }),
          });
          yield* Effect.log(`Deleted existing result: ${existing.title}`);
        }
      }
    }

    // Extract postal code from address if available (6 digits)
    const postalCode = result.address?.match(/\b\d{6}\b/)?.[0];

    // Save the new result (with timeout)
    yield* Effect.log(`Saving new result: "${result.title}" in ${city}`);
    const newConvexId = yield* Effect.tryPromise({
      try: () =>
        withTimeout(
          client.mutation(api.locations.saveLocation, {
            title: result.title,
            description: result.description,
            latitude: result.location.latitude,
            longitude: result.location.longitude,
            source: result.source,
            timestamp: Date.now(), // Update timestamp
            city, // Save detected city
            isRandomizable: true, // Mark as randomizable for random navigation feature
            postalCode: postalCode, // Save postal code if found
          }),
          10000,
        ),
      catch: (error) => ({
        _tag: "ConvexError" as const,
        message: `Failed to save: ${error}`,
      }),
    });

    yield* Effect.log(
      `Successfully saved to Convex: ${result.title} (ID: ${newConvexId})`,
    );

    // Note: No need to dispatch custom events anymore!
    // Convex reactive queries will automatically update all components in real-time

    return { success: true, id: newConvexId as string };
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError("Save location failed:", error);

        // More helpful error messages
        const errorMessage =
          typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : String(error);

        if (
          errorMessage.includes("timed out") ||
          errorMessage.includes("ETIMEDOUT")
        ) {
          return {
            success: false,
            error: "Connection timed out. Is 'npx convex dev' running?",
          };
        }
        if (errorMessage.includes("ECONNREFUSED")) {
          return {
            success: false,
            error: "Cannot connect to Convex. Start 'npx convex dev' first.",
          };
        }

        return {
          success: false,
          error: errorMessage || "Failed to save location to Convex",
        };
      }),
    ),
  );

/**
 * Server Action: Manually save a location to Convex (with override support)
 *
 * This allows users to manually choose which result to save to Convex,
 * overriding any existing results for the same location name.
 *
 * Uses the managed server runtime initialized in instrumentation.ts.
 */
export async function saveLocationToConvexAction(
  result: SearchResult,
): Promise<{ success: boolean; error?: string; id?: string }> {
  return await runServerEffectAsync(saveLocationEffect(result));
}
