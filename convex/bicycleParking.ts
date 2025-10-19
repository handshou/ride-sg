import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Query: Get bicycle parking locations near a query point
 *
 * Searches for cached bicycle parking data within a small radius
 * of the provided coordinates.
 */
export const getBicycleParkingByLocation = query({
  args: {
    queryLatitude: v.number(),
    queryLongitude: v.number(),
    radiusThreshold: v.optional(v.number()), // Default: 0.01 degrees (~1km)
  },
  handler: async (ctx, args) => {
    const threshold = args.radiusThreshold ?? 0.01;

    // Get all bicycle parking locations
    const allParking = await ctx.db.query("bicycleParking").collect();

    // Filter by distance threshold
    const nearbyParking = allParking.filter((parking) => {
      const latDiff = Math.abs(parking.queryLatitude - args.queryLatitude);
      const longDiff = Math.abs(parking.queryLongitude - args.queryLongitude);

      // Simple bounding box check
      return latDiff <= threshold && longDiff <= threshold;
    });

    return nearbyParking;
  },
});

/**
 * Query: Get all bicycle parking locations
 */
export const getAllBicycleParking = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("bicycleParking").collect();
  },
});

/**
 * Mutation: Save bicycle parking locations (batch)
 *
 * Saves multiple bicycle parking locations from LTA API response.
 * Deletes old cached results for the same query location first.
 */
export const saveBicycleParking = mutation({
  args: {
    parkingLocations: v.array(
      v.object({
        description: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        rackType: v.string(),
        rackCount: v.number(),
        shelterIndicator: v.string(),
        queryLatitude: v.number(),
        queryLongitude: v.number(),
        timestamp: v.number(),
      }),
    ),
    queryLatitude: v.number(),
    queryLongitude: v.number(),
  },
  handler: async (ctx, args) => {
    const threshold = 0.01;

    // Delete old cached results for this query location
    const existingParking = await ctx.db.query("bicycleParking").collect();

    for (const parking of existingParking) {
      const latDiff = Math.abs(parking.queryLatitude - args.queryLatitude);
      const longDiff = Math.abs(parking.queryLongitude - args.queryLongitude);

      if (latDiff <= threshold && longDiff <= threshold) {
        await ctx.db.delete(parking._id);
      }
    }

    // Insert new parking locations
    const insertedIds = [];
    for (const location of args.parkingLocations) {
      const id = await ctx.db.insert("bicycleParking", location);
      insertedIds.push(id);
    }

    return { count: insertedIds.length, ids: insertedIds };
  },
});

/**
 * Mutation: Delete old bicycle parking cache entries
 *
 * Removes parking data older than the specified timestamp.
 */
export const deleteOldBicycleParking = mutation({
  args: {
    olderThan: v.number(), // Unix timestamp in milliseconds
  },
  handler: async (ctx, args) => {
    const oldParking = await ctx.db
      .query("bicycleParking")
      .filter((q) => q.lt(q.field("timestamp"), args.olderThan))
      .collect();

    let deletedCount = 0;
    for (const parking of oldParking) {
      await ctx.db.delete(parking._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});
