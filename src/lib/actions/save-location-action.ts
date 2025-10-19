"use server";

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { SearchResult } from "../services/search-state-service";

/**
 * Server Action: Manually save a location to Convex (with override support)
 *
 * This allows users to manually choose which result to save to Convex,
 * overriding any existing results for the same location name.
 */
export async function saveLocationToConvexAction(
  result: SearchResult,
): Promise<{ success: boolean; error?: string }> {
  try {
    const deployment = process.env.NEXT_PUBLIC_CONVEX_URL;

    if (!deployment) {
      return {
        success: false,
        error: "Convex not configured",
      };
    }

    const client = new ConvexHttpClient(deployment);

    // First, search for existing results with similar titles
    const existingResults = await client.query(api.locations.searchLocations, {
      query: result.title,
    });

    // Delete any existing results that match closely (to override)
    if (existingResults.length > 0) {
      console.log(
        `Found ${existingResults.length} existing results, will override...`,
      );

      for (const existing of existingResults) {
        // Check if titles are very similar (case-insensitive match)
        const titleMatch =
          existing.title.toLowerCase().trim() ===
          result.title.toLowerCase().trim();

        if (titleMatch) {
          await client.mutation(api.locations.deleteLocation, {
            id: existing._id,
          });
          console.log(`Deleted existing result: ${existing.title}`);
        }
      }
    }

    // Save the new result
    await client.mutation(api.locations.saveLocation, {
      title: result.title,
      description: result.description,
      latitude: result.location.latitude,
      longitude: result.location.longitude,
      source: result.source,
      timestamp: Date.now(), // Update timestamp
    });

    console.log(`✓ Saved to Convex: ${result.title}`);

    return { success: true };
  } catch (error) {
    console.error("Save location action failed:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to save location to Convex",
    };
  }
}
