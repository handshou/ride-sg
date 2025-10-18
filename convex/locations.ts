import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Query: Search locations by title or description
 */
export const searchLocations = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const locations = await ctx.db.query("locations").collect();

    // Simple search filter
    const filteredLocations = locations.filter(
      (loc) =>
        loc.title.toLowerCase().includes(args.query.toLowerCase()) ||
        loc.description.toLowerCase().includes(args.query.toLowerCase()),
    );

    return filteredLocations;
  },
});

/**
 * Query: Get all locations
 */
export const getAllLocations = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("locations").order("desc").collect();
  },
});

/**
 * Mutation: Save a new location
 */
export const saveLocation = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    source: v.union(
      v.literal("mapbox"),
      v.literal("exa"),
      v.literal("database"),
    ),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const locationId = await ctx.db.insert("locations", {
      title: args.title,
      description: args.description,
      latitude: args.latitude,
      longitude: args.longitude,
      source: args.source,
      timestamp: args.timestamp,
    });

    return locationId;
  },
});

/**
 * Mutation: Delete a location by ID
 */
export const deleteLocation = mutation({
  args: { id: v.id("locations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
