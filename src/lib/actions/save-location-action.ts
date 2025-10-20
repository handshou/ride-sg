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
      console.error("❌ NEXT_PUBLIC_CONVEX_URL not configured");
      return {
        success: false,
        error: "Convex not configured. Run 'npx convex dev' first.",
      };
    }

    console.log(`🔗 Connecting to Convex: ${deployment}`);
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

    // First, search for existing results with similar titles (with timeout)
    console.log(`🔍 Searching for existing results: "${result.title}"`);
    const existingResults = await withTimeout(
      client.query(api.locations.searchLocations, {
        query: result.title,
      }),
      10000, // 10 second timeout
    );

    // Delete any existing results that match closely (to override)
    if (existingResults.length > 0) {
      console.log(
        `📝 Found ${existingResults.length} existing results, will override...`,
      );

      for (const existing of existingResults) {
        // Check if titles are very similar (case-insensitive match)
        const titleMatch =
          existing.title.toLowerCase().trim() ===
          result.title.toLowerCase().trim();

        if (titleMatch) {
          await withTimeout(
            client.mutation(api.locations.deleteLocation, {
              id: existing._id,
            }),
            10000,
          );
          console.log(`🗑️ Deleted existing result: ${existing.title}`);
        }
      }
    }

    // Save the new result (with timeout)
    console.log(`💾 Saving new result: "${result.title}"`);
    await withTimeout(
      client.mutation(api.locations.saveLocation, {
        title: result.title,
        description: result.description,
        latitude: result.location.latitude,
        longitude: result.location.longitude,
        source: result.source,
        timestamp: Date.now(), // Update timestamp
        isRandomizable: true, // Mark as randomizable for random navigation feature
      }),
      10000,
    );

    console.log(`✅ Successfully saved to Convex: ${result.title}`);

    // Dispatch event to notify components to refetch saved locations
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("locationSaved"));
    }

    return { success: true };
  } catch (error) {
    console.error("❌ Save location action failed:", error);

    // More helpful error messages
    if (error instanceof Error) {
      if (
        error.message.includes("timed out") ||
        error.message.includes("ETIMEDOUT")
      ) {
        return {
          success: false,
          error: "Connection timed out. Is 'npx convex dev' running?",
        };
      }
      if (error.message.includes("ECONNREFUSED")) {
        return {
          success: false,
          error: "Cannot connect to Convex. Start 'npx convex dev' first.",
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "Failed to save location to Convex",
    };
  }
}
