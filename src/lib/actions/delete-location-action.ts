"use server";

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

/**
 * Server Action: Delete a location from Convex
 *
 * This allows users to remove bad or outdated results from the cache.
 */
export async function deleteLocationFromConvexAction(
  locationId: string,
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

    // Delete the location
    await client.mutation(api.locations.deleteLocation, {
      id: locationId as never, // Type assertion for Convex ID
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
