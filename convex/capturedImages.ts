import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Query: Get all captured images ordered by capture time (newest first)
 */
export const getAllImages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("capturedImages")
      .withIndex("by_captured_at")
      .order("desc")
      .collect();
  },
});

/**
 * Query: Get captured images by location
 */
export const getImagesByLocation = query({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    radiusKm: v.optional(v.number()), // Search radius in kilometers
  },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("capturedImages")
      .withIndex("by_location", (q) =>
        q.eq("latitude", args.latitude).eq("longitude", args.longitude),
      )
      .collect();

    // If radius is specified, filter by distance
    if (args.radiusKm && args.radiusKm > 0) {
      const radiusKm = args.radiusKm;
      return images.filter((img) => {
        if (img.latitude == null || img.longitude == null) return false;

        // Simple distance calculation (Haversine formula)
        const lat1 = (args.latitude * Math.PI) / 180;
        const lat2 = (img.latitude * Math.PI) / 180;
        const dLat = ((img.latitude - args.latitude) * Math.PI) / 180;
        const dLon = ((img.longitude - args.longitude) * Math.PI) / 180;

        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1) *
            Math.cos(lat2) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = 6371 * c; // Earth radius in km

        return distance <= radiusKm;
      });
    }

    return images;
  },
});

/**
 * Query: Get images not yet analyzed
 */
export const getNotAnalyzedImages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("capturedImages")
      .withIndex("by_analysis_status", (q) =>
        q.eq("analysisStatus", "not_analyzed"),
      )
      .collect();
  },
});

/**
 * Mutation: Generate upload URL for image storage
 */
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

/**
 * Mutation: Save captured image metadata after upload
 */
export const saveCapturedImage = mutation({
  args: {
    storageId: v.string(),
    width: v.number(),
    height: v.number(),
    orientation: v.union(v.literal("portrait"), v.literal("landscape")),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    cameraGpsLatitude: v.optional(v.number()),
    cameraGpsLongitude: v.optional(v.number()),
    deviceHeading: v.optional(v.number()),
    cameraFov: v.optional(v.number()),
    capturedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Get the URL for the stored image
    const imageUrl = await ctx.storage.getUrl(args.storageId);

    if (!imageUrl) {
      throw new Error("Failed to get image URL from storage");
    }

    const imageId = await ctx.db.insert("capturedImages", {
      imageUrl,
      storageId: args.storageId,
      width: args.width,
      height: args.height,
      orientation: args.orientation,
      latitude: args.latitude,
      longitude: args.longitude,
      cameraGpsLatitude: args.cameraGpsLatitude,
      cameraGpsLongitude: args.cameraGpsLongitude,
      deviceHeading: args.deviceHeading,
      cameraFov: args.cameraFov,
      analysisStatus: "not_analyzed",
      capturedAt: args.capturedAt,
    });

    return imageId;
  },
});

/**
 * Mutation: Update image analysis result
 */
export const updateImageAnalysis = mutation({
  args: {
    imageId: v.id("capturedImages"),
    analysis: v.string(),
    analyzedObjects: v.optional(
      v.array(
        v.object({
          name: v.string(),
          confidence: v.optional(v.number()),
          bearing: v.optional(v.number()),
          distance: v.optional(v.number()),
          description: v.optional(v.string()),
        }),
      ),
    ),
    status: v.union(
      v.literal("not_analyzed"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("processing"),
    ),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updateData: {
      analysis: string;
      analyzedObjects?: Array<{
        name: string;
        confidence?: number;
        bearing?: number;
        distance?: number;
        description?: string;
      }>;
      analysisStatus: "not_analyzed" | "completed" | "failed" | "processing";
      latitude?: number;
      longitude?: number;
    } = {
      analysis: args.analysis,
      analyzedObjects: args.analyzedObjects,
      analysisStatus: args.status,
    };

    // Only update location if provided (from geocoding)
    if (args.latitude !== undefined && args.longitude !== undefined) {
      updateData.latitude = args.latitude;
      updateData.longitude = args.longitude;
    }

    await ctx.db.patch(args.imageId, updateData);
    return args.imageId;
  },
});

/**
 * Mutation: Delete a captured image
 */
export const deleteCapturedImage = mutation({
  args: { id: v.id("capturedImages") },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.id);
    if (image) {
      // Delete from storage first
      await ctx.storage.delete(image.storageId);
      // Then delete the database record
      await ctx.db.delete(args.id);
    }
  },
});
