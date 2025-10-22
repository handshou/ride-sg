"use server";

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * Server Action: Delete a location from Convex
 *
 * This allows users to remove bad or outdated results from the cache.
 */
export async function deleteLocationFromConvexAction(
  locationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate that this looks like a Convex ID
    // Convex IDs don't have hyphens and are typically 26+ characters
    if (locationId.includes("-") || locationId.length < 20) {
      console.warn(
        `⚠️ Invalid Convex ID format: "${locationId}" (has hyphens or too short)`,
      );
      return {
        success: false,
        error:
          "Cannot delete: this result is not saved in the database. Please refresh the search results.",
      };
    }

    const deployment = process.env.NEXT_PUBLIC_CONVEX_URL;

    if (!deployment) {
      return {
        success: false,
        error: "Convex not configured",
      };
    }

    const client = new ConvexHttpClient(deployment);

    // Delete the location - cast string to proper Convex ID type
    await client.mutation(api.locations.deleteLocation, {
      id: locationId as Id<"locations">,
    });

    console.log(`✓ Deleted from Convex: ${locationId}`);

    return { success: true };
  } catch (error) {
    console.error("Delete location action failed:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete location from Convex",
    };
  }
}
