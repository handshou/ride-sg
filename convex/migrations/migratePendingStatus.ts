import { internalMutation } from "../_generated/server";

/**
 * Migration: Update all "pending" analysisStatus to "not_analyzed"
 *
 * Run this once after deployment to migrate old data.
 * Can be called manually via Convex dashboard or CLI.
 */
export const migratePendingToNotAnalyzed = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all images with "pending" status
    const pendingImages = await ctx.db
      .query("capturedImages")
      .withIndex("by_analysis_status", (q) => q.eq("analysisStatus", "pending"))
      .collect();

    console.log(`Found ${pendingImages.length} images with "pending" status`);

    // Update each one to "not_analyzed"
    for (const image of pendingImages) {
      await ctx.db.patch(image._id, {
        analysisStatus: "not_analyzed",
      });
    }

    console.log(
      `Successfully migrated ${pendingImages.length} images from "pending" to "not_analyzed"`,
    );

    return {
      migratedCount: pendingImages.length,
      message: `Migrated ${pendingImages.length} images from "pending" to "not_analyzed"`,
    };
  },
});
