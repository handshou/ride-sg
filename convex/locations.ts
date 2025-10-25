import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Calculate similarity score between two strings (0-1)
 * Uses a simple word-overlap algorithm
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);

  let matchCount = 0;
  for (const word1 of words1) {
    if (word1.length < 3) continue; // Skip short words
    for (const word2 of words2) {
      if (word2.length < 3) continue;
      // Exact match or one contains the other
      if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
        matchCount++;
        break;
      }
    }
  }

  const maxWords = Math.max(words1.length, words2.length);
  return maxWords > 0 ? matchCount / maxWords : 0;
}

/**
 * Query: Search locations by title or description with similarity matching
 * Only returns results with high keyword match (>= 0.4 similarity)
 */
export const searchLocations = query({
  args: {
    query: v.string(),
    city: v.optional(v.union(v.literal("singapore"), v.literal("jakarta"))),
  },
  handler: async (ctx, args) => {
    const locations = args.city
      ? await ctx.db
          .query("locations")
          .withIndex("by_city", (q) =>
            q.eq("city", args.city as "singapore" | "jakarta"),
          )
          .collect()
      : await ctx.db.query("locations").collect();
    const queryLower = args.query.toLowerCase();

    // Filter and score locations
    const scoredLocations = locations
      .map((loc) => {
        const titleSimilarity = calculateSimilarity(args.query, loc.title);
        const descSimilarity = calculateSimilarity(args.query, loc.description);

        // Also check for direct substring matches (boost score)
        const titleMatch = loc.title.toLowerCase().includes(queryLower);
        const descMatch = loc.description.toLowerCase().includes(queryLower);

        const maxSimilarity = Math.max(titleSimilarity, descSimilarity);
        const finalScore =
          maxSimilarity + (titleMatch ? 0.2 : 0) + (descMatch ? 0.1 : 0);

        return {
          ...loc,
          score: finalScore,
        };
      })
      .filter((loc) => loc.score >= 0.4) // Only return high-confidence matches
      .sort((a, b) => b.score - a.score); // Sort by relevance

    // Remove score from results
    return scoredLocations.map(({ score, ...loc }) => loc);
  },
});

/**
 * Query: Get all locations
 */
export const getAllLocations = query({
  args: {
    city: v.optional(v.union(v.literal("singapore"), v.literal("jakarta"))),
  },
  handler: async (ctx, args) => {
    if (args.city) {
      return await ctx.db
        .query("locations")
        .withIndex("by_city", (q) =>
          q.eq("city", args.city as "singapore" | "jakarta"),
        )
        .order("desc")
        .collect();
    }
    return await ctx.db.query("locations").order("desc").collect();
  },
});

/**
 * Query: Get randomizable locations (for random navigation feature)
 */
export const getRandomizableLocations = query({
  args: {
    city: v.optional(v.union(v.literal("singapore"), v.literal("jakarta"))),
  },
  handler: async (ctx, args) => {
    if (args.city) {
      return await ctx.db
        .query("locations")
        .withIndex("by_city_randomizable", (q) =>
          q
            .eq("city", args.city as "singapore" | "jakarta")
            .eq("isRandomizable", true),
        )
        .collect();
    }
    return await ctx.db
      .query("locations")
      .filter((q) => q.eq(q.field("isRandomizable"), true))
      .collect();
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
    city: v.union(v.literal("singapore"), v.literal("jakarta")),
    isRandomizable: v.optional(v.boolean()),
    postalCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const locationId = await ctx.db.insert("locations", {
      title: args.title,
      description: args.description,
      latitude: args.latitude,
      longitude: args.longitude,
      source: args.source,
      timestamp: args.timestamp,
      city: args.city,
      isRandomizable: args.isRandomizable,
      postalCode: args.postalCode,
    });

    return locationId;
  },
});

/**
 * Mutation: Update an existing location with fresh data
 */
export const updateLocation = mutation({
  args: {
    id: v.id("locations"),
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
    city: v.union(v.literal("singapore"), v.literal("jakarta")),
    postalCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
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
