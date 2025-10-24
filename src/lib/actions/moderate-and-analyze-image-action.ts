"use server";

import { ConvexHttpClient } from "convex/browser";
import { Effect, Layer } from "effect";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { runServerEffectAsync } from "../server-runtime";
import {
  ContentModerationServiceLive,
  ContentModerationServiceTag,
} from "../services/content-moderation-service";
import { VisionService } from "../services/vision-service";

/**
 * Effect program for moderating and analyzing an image
 */
const moderateAndAnalyzeImageEffect = (
  imageId: string,
  imageUrl: string,
  latitude?: number,
  longitude?: number,
) =>
  Effect.gen(function* () {
    const deployment = process.env.NEXT_PUBLIC_CONVEX_URL;

    if (!deployment) {
      yield* Effect.logError("NEXT_PUBLIC_CONVEX_URL not configured");
      return {
        success: false,
        error: "Convex not configured. Run 'npx convex dev' first.",
      };
    }

    yield* Effect.log(`Analyzing and moderating image: ${imageId}`);
    const client = new ConvexHttpClient(deployment);

    // Update status to processing
    yield* Effect.tryPromise({
      try: () =>
        client.mutation(api.capturedImages.updateImageAnalysis, {
          imageId: imageId as Id<"capturedImages">,
          analysis: "Analyzing image...",
          status: "processing",
        }),
      catch: (error) => ({
        _tag: "ConvexError" as const,
        message: `Failed to update status: ${error}`,
      }),
    });

    // First, analyze the image to get description
    const visionService = yield* VisionService;

    // Build context for Vision API
    const visionContext =
      latitude && longitude
        ? { latitude, longitude, timestamp: new Date().toISOString() }
        : undefined;

    const analysisResult = yield* visionService
      .analyzeImage(imageUrl, visionContext)
      .pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Effect.logError("Vision analysis failed:", error);
            return yield* Effect.fail(error);
          }),
        ),
      );

    // Format the analysis result
    let formattedAnalysis = analysisResult.description;

    if (analysisResult.landmarks && analysisResult.landmarks.length > 0) {
      formattedAnalysis += `\n\n🏛️ Landmarks: ${analysisResult.landmarks.join(", ")}`;
    }

    if (
      analysisResult.locationClues &&
      analysisResult.locationClues.length > 0
    ) {
      formattedAnalysis += `\n\n📍 Location Clues: ${analysisResult.locationClues.join(", ")}`;
    }

    if (analysisResult.safetyNotes) {
      formattedAnalysis += `\n\n⚠️ Safety Notes: ${analysisResult.safetyNotes}`;
    }

    // Now check for inappropriate content
    yield* Effect.log("Checking content moderation...");
    const moderationService = yield* ContentModerationServiceTag;

    const moderationResult = yield* moderationService
      .checkText(formattedAnalysis)
      .pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Effect.logWarning(
              "Moderation check failed, treating as safe by default",
              error,
            );
            return {
              flagged: false,
              categories: {
                sexual: false,
                hate: false,
                harassment: false,
                selfHarm: false,
                sexualMinors: false,
                hateThreatening: false,
                violenceGraphic: false,
                selfHarmIntent: false,
                selfHarmInstructions: false,
                harassmentThreatening: false,
                violence: false,
              },
              categoryScores: {
                sexual: 0,
                hate: 0,
                harassment: 0,
                selfHarm: 0,
                sexualMinors: 0,
                hateThreatening: 0,
                violenceGraphic: 0,
                selfHarmIntent: 0,
                selfHarmInstructions: 0,
                harassmentThreatening: 0,
                violence: 0,
              },
            };
          }),
        ),
      );

    // Check if content is inappropriate (18+ or other violations)
    const isInappropriate =
      moderationResult.flagged ||
      moderationResult.categories.sexual ||
      moderationResult.categories.sexualMinors ||
      moderationResult.categoryScores.sexual > 0.5; // High threshold for adult content

    if (isInappropriate) {
      yield* Effect.logWarning(
        `Inappropriate content detected in image ${imageId}. Deleting...`,
      );

      // Delete the image
      yield* Effect.tryPromise({
        try: () =>
          client.mutation(api.capturedImages.deleteCapturedImage, {
            id: imageId as Id<"capturedImages">,
          }),
        catch: (error) => ({
          _tag: "ConvexError" as const,
          message: `Failed to delete inappropriate image: ${error}`,
        }),
      });

      return {
        success: false,
        error: "Image was removed due to inappropriate content",
        deleted: true,
      };
    }

    // Image is safe, update with analysis
    yield* Effect.tryPromise({
      try: () =>
        client.mutation(api.capturedImages.updateImageAnalysis, {
          imageId: imageId as Id<"capturedImages">,
          analysis: formattedAnalysis,
          status: "completed",
        }),
      catch: (error) => ({
        _tag: "ConvexError" as const,
        message: `Failed to save analysis: ${error}`,
      }),
    });

    yield* Effect.log(`Successfully analyzed image: ${imageId}`);

    return {
      success: true,
      analysis: formattedAnalysis,
      moderation: {
        flagged: moderationResult.flagged,
        scores: moderationResult.categoryScores,
      },
    };
  }).pipe(
    Effect.provide(
      Layer.succeed(ContentModerationServiceTag, ContentModerationServiceLive),
    ),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError("Moderate and analyze image failed:", error);

        const errorMessage =
          typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : String(error);

        return {
          success: false,
          error: errorMessage || "Failed to analyze image",
        };
      }),
    ),
  );

/**
 * Server Action: Analyze and moderate a captured image
 * Checks for inappropriate content and automatically deletes if found
 */
export async function moderateAndAnalyzeImageAction(
  imageId: string,
  imageUrl: string,
  latitude?: number,
  longitude?: number,
): Promise<{
  success: boolean;
  error?: string;
  analysis?: string;
  deleted?: boolean;
  moderation?: {
    flagged: boolean;
    scores: Record<string, number>;
  };
}> {
  return await runServerEffectAsync(
    moderateAndAnalyzeImageEffect(imageId, imageUrl, latitude, longitude),
  );
}
