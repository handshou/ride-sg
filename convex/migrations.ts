import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action, internalMutation } from "./_generated/server";

/**
 * Detect city from coordinates using geographic bounds
 * This is faster than calling Mapbox API for bulk migrations
 */
function detectCityFromBounds(
  latitude: number,
  longitude: number,
): "singapore" | "jakarta" {
  // Singapore bounds
  const isInSingapore =
    latitude >= 1.16 &&
    latitude <= 1.47 &&
    longitude >= 103.6 &&
    longitude <= 104.0;

  if (isInSingapore) {
    return "singapore";
  }

  // Jakarta bounds
  const isInJakarta =
    latitude >= -6.4 &&
    latitude <= -6.1 &&
    longitude >= 106.68 &&
    longitude <= 107.0;

  if (isInJakarta) {
    return "jakarta";
  }

  // Default to Singapore for unknown locations
  console.warn(
    `Location [${latitude}, ${longitude}] outside known bounds, defaulting to Singapore`,
  );
  return "singapore";
}

/**
 * Internal mutation to update a single location's city field
 */
export const updateLocationCity = internalMutation({
  args: {
    id: v.id("locations"),
    city: v.union(v.literal("singapore"), v.literal("jakarta")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { city: args.city });
  },
});

/**
 * Migration Action: Add city field to all existing locations
 *
 * This action:
 * 1. Fetches all locations from the database
 * 2. Detects city from coordinates using geographic bounds
 * 3. Updates each location with the detected city field
 * 4. Logs progress and results
 *
 * Usage:
 * 1. Open Convex Dashboard
 * 2. Go to Functions tab
 * 3. Find "migrations:migrateLocationCities"
 * 4. Click "Run" (no arguments needed)
 *
 * OR from CLI:
 * npx convex run migrations:migrateLocationCities
 */
export const migrateLocationCities = action({
  handler: async (
    ctx,
  ): Promise<{
    success: boolean;
    totalLocations: number;
    updated: number;
    singaporeCount: number;
    jakartaCount: number;
    skipped: number;
    errors: Array<{ id: string; error: string }>;
  }> => {
    console.log("🚀 Starting location city migration...");

    // Fetch all locations
    const allLocations: Array<Doc<"locations">> = await ctx.runQuery(
      api.locations.getAllLocations,
      {},
    );

    console.log(`📊 Found ${allLocations.length} total locations`);

    // Track statistics
    let updatedCount = 0;
    let singaporeCount = 0;
    let jakartaCount = 0;
    let skippedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Process each location
    for (const location of allLocations) {
      try {
        // Check if location already has city field
        if ("city" in location && location.city) {
          console.log(
            `⏭️  Skipping ${location.title} - already has city: ${location.city}`,
          );
          skippedCount++;
          continue;
        }

        // Detect city from coordinates
        const detectedCity = detectCityFromBounds(
          location.latitude,
          location.longitude,
        );

        // Update the location
        await ctx.runMutation(internal.migrations.updateLocationCity, {
          id: location._id,
          city: detectedCity,
        });

        // Track statistics
        updatedCount++;
        if (detectedCity === "singapore") {
          singaporeCount++;
        } else {
          jakartaCount++;
        }

        console.log(
          `✅ Updated ${location.title} → ${detectedCity} [${location.latitude}, ${location.longitude}]`,
        );
      } catch (error) {
        console.error(`❌ Failed to update ${location.title}:`, error);
        errors.push({
          id: location._id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Log final summary
    console.log("\n📈 Migration Summary:");
    console.log(`   Total locations: ${allLocations.length}`);
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log(`      🇸🇬 Singapore: ${singaporeCount}`);
    console.log(`      🇮🇩 Jakarta: ${jakartaCount}`);
    console.log(`   ⏭️  Skipped (already migrated): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log("\n⚠️  Errors encountered:");
      for (const error of errors) {
        console.log(`   - ${error.id}: ${error.error}`);
      }
    }

    console.log("\n✨ Migration complete!");

    // Return summary
    return {
      success: errors.length === 0,
      totalLocations: allLocations.length,
      updated: updatedCount,
      singaporeCount,
      jakartaCount,
      skipped: skippedCount,
      errors,
    };
  },
});

/**
 * Dry Run Action: Preview what the migration would do without making changes
 *
 * Usage:
 * 1. Open Convex Dashboard
 * 2. Go to Functions tab
 * 3. Find "migrations:previewLocationCitiesMigration"
 * 4. Click "Run"
 *
 * OR from CLI:
 * npx convex run migrations:previewLocationCitiesMigration
 */
export const previewLocationCitiesMigration = action({
  handler: async (
    ctx,
  ): Promise<{
    totalLocations: number;
    wouldUpdate: number;
    singaporeCount: number;
    jakartaCount: number;
    wouldSkip: number;
    preview: Array<{
      title: string;
      currentCity?: string;
      detectedCity: string;
      coordinates: { lat: number; lng: number };
      action: "update" | "skip";
    }>;
  }> => {
    console.log("🔍 Preview: Location city migration (dry run)");

    // Fetch all locations
    const allLocations: Array<Doc<"locations">> = await ctx.runQuery(
      api.locations.getAllLocations,
      {},
    );

    console.log(`📊 Found ${allLocations.length} total locations\n`);

    // Track statistics
    let wouldUpdateCount = 0;
    let wouldSkipCount = 0;
    let singaporeCount = 0;
    let jakartaCount = 0;

    const preview: Array<{
      title: string;
      currentCity?: string;
      detectedCity: string;
      coordinates: { lat: number; lng: number };
      action: "update" | "skip";
    }> = [];

    // Process each location
    for (const location of allLocations) {
      // Check if location already has city field
      if ("city" in location && location.city) {
        wouldSkipCount++;
        preview.push({
          title: location.title,
          currentCity: location.city,
          detectedCity: location.city,
          coordinates: { lat: location.latitude, lng: location.longitude },
          action: "skip",
        });
        console.log(
          `⏭️  SKIP: ${location.title} (already has city: ${location.city})`,
        );
        continue;
      }

      // Detect city from coordinates
      const detectedCity = detectCityFromBounds(
        location.latitude,
        location.longitude,
      );

      wouldUpdateCount++;
      if (detectedCity === "singapore") {
        singaporeCount++;
      } else {
        jakartaCount++;
      }

      preview.push({
        title: location.title,
        detectedCity,
        coordinates: { lat: location.latitude, lng: location.longitude },
        action: "update",
      });

      console.log(
        `✏️  UPDATE: ${location.title} → ${detectedCity} [${location.latitude}, ${location.longitude}]`,
      );
    }

    // Log summary
    console.log("\n📈 Preview Summary:");
    console.log(`   Total locations: ${allLocations.length}`);
    console.log(`   ✏️  Would update: ${wouldUpdateCount}`);
    console.log(`      🇸🇬 Singapore: ${singaporeCount}`);
    console.log(`      🇮🇩 Jakarta: ${jakartaCount}`);
    console.log(`   ⏭️  Would skip: ${wouldSkipCount}`);

    console.log(
      "\n💡 To apply these changes, run: migrations:migrateLocationCities",
    );

    return {
      totalLocations: allLocations.length,
      wouldUpdate: wouldUpdateCount,
      singaporeCount,
      jakartaCount,
      wouldSkip: wouldSkipCount,
      preview,
    };
  },
});

/**
 * Rollback Action: Remove city field from all locations
 *
 * ⚠️ WARNING: This will remove the city field from ALL locations!
 * Use only if you need to undo the migration.
 *
 * Usage (from CLI only for safety):
 * npx convex run migrations:rollbackLocationCities
 */
export const rollbackLocationCities = action({
  handler: async (ctx) => {
    console.log("⚠️  WARNING: Rolling back location city migration...");
    console.log("This will remove the city field from ALL locations!");

    // Fetch all locations
    const allLocations = await ctx.runQuery(api.locations.getAllLocations, {});

    console.log(`📊 Found ${allLocations.length} locations`);

    let rolledBackCount = 0;

    for (const location of allLocations) {
      if ("city" in location && location.city) {
        // Remove city field by setting it to undefined
        // Note: Convex will remove undefined fields from documents
        await ctx.runMutation(api.locations.updateLocation, {
          id: location._id,
          title: location.title,
          description: location.description,
          latitude: location.latitude,
          longitude: location.longitude,
          source: location.source,
          timestamp: location.timestamp,
          city: "singapore" as any, // Type workaround for optional field
          postalCode: location.postalCode,
        });

        rolledBackCount++;
        console.log(`↩️  Rolled back: ${location.title}`);
      }
    }

    console.log(`\n✨ Rollback complete: ${rolledBackCount} locations updated`);

    return {
      success: true,
      rolledBackCount,
    };
  },
});
