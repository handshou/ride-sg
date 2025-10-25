"use server";

import type { City } from "@/hooks/use-city-context";
import { runCoordinatedSearch } from "../search-orchestrator";
import { runServerEffectAsync } from "../server-runtime";
import type { SearchResult } from "../services/search-state-service";

/**
 * Server Action: Perform a coordinated search
 *
 * This runs on the server side using the managed runtime, keeping API keys secure.
 * The search orchestrator will:
 * 1. Search Convex first
 * 2. If empty, search Exa API (server-side, secure)
 * 3. Geocode results with Mapbox (server-side, secure)
 * 4. Calculate distances if reference location provided
 * 5. Sort results by distance (if applicable)
 * 6. Return results to client
 *
 * Uses the managed server runtime initialized in instrumentation.ts.
 * All services are automatically provided by the runtime.
 *
 * @param query - Search query string
 * @param userLocation - Optional user location for Exa query context
 * @param referenceLocation - Optional reference location for distance calculation
 * @param locationName - Optional human-readable location name from reverse geocoding
 * @param city - City context (singapore or jakarta) for search filtering
 */
export async function searchLandmarksAction(
  query: string,
  userLocation?: { latitude: number; longitude: number },
  referenceLocation?: { latitude: number; longitude: number },
  locationName?: string,
  city?: City,
): Promise<{ results: SearchResult[]; error?: string }> {
  try {
    // Run the coordinated search effect using managed runtime
    const results = await runServerEffectAsync(
      runCoordinatedSearch(
        query,
        userLocation,
        referenceLocation,
        locationName,
        city,
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
