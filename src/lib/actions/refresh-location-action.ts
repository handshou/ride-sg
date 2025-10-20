"use server";

import { Effect } from "effect";
import { ConfigService } from "../services/config-service";
import { refreshLocationFromExa } from "../services/exa-search-service";
import type { SearchResult } from "../services/search-state-service";

/**
 * Server Action: Refresh a single location from Exa Answer API
 *
 * This updates the location data with fresh information from Exa,
 * geocodes it with Mapbox, and updates Convex.
 */
export async function refreshLocationAction(
  locationName: string,
  locationId?: string,
): Promise<{ result: SearchResult | null; error?: string }> {
  try {
    const result = await Effect.runPromise(
      refreshLocationFromExa(locationName, locationId).pipe(
        Effect.provide(ConfigService.Default),
      ),
    );

    if (!result) {
      return {
        result: null,
        error: "Could not find updated information for this location",
      };
    }

    return { result };
  } catch (error) {
    console.error("Refresh location action failed:", error);
    return {
      result: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to refresh location data",
    };
  }
}
