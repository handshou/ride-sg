"use server";

import { Effect } from "effect";
import { runCoordinatedSearch } from "../search-orchestrator";
import type { SearchResult } from "../services/search-state-service";

/**
 * Server Action: Perform a coordinated search
 *
 * This runs on the server side, keeping API keys secure.
 * The search orchestrator will:
 * 1. Search Convex first
 * 2. If empty, search Exa API (server-side, secure)
 * 3. Geocode results with Mapbox (server-side, secure)
 * 4. Calculate distances if reference location provided
 * 5. Sort results by distance (if applicable)
 * 6. Return results to client
 *
 * @param query - Search query string
 * @param userLocation - Optional user location for Exa query context
 * @param referenceLocation - Optional reference location for distance calculation
 * @param locationName - Optional human-readable location name from reverse geocoding
 */
export async function searchLandmarksAction(
  query: string,
  userLocation?: { latitude: number; longitude: number },
  referenceLocation?: { latitude: number; longitude: number },
  locationName?: string,
): Promise<{ results: SearchResult[]; error?: string }> {
  try {
    // Run the coordinated search effect
    const results = await Effect.runPromise(
      runCoordinatedSearch(
        query,
        userLocation,
        referenceLocation,
        locationName,
      ),
    );

    return { results };
  } catch (error) {
    console.error("Search action failed:", error);
    return {
      results: [],
      error:
        error instanceof Error ? error.message : "Search failed unexpectedly",
    };
  }
}
