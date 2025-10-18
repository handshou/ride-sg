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
 * 4. Save results to Convex
 * 5. Return results to client
 */
export async function searchLandmarksAction(
  query: string,
): Promise<{ results: SearchResult[]; error?: string }> {
  try {
    // Run the coordinated search effect
    const results = await Effect.runPromise(runCoordinatedSearch(query));

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
