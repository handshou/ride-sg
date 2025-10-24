"use server";

import { ConvexHttpClient } from "convex/browser";
import { Config, Effect, Layer } from "effect";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { runServerEffectAsync } from "../server-runtime";
import {
  ContentModerationServiceLive,
  ContentModerationServiceTag,
} from "../services/content-moderation-service";
import { ExaSearchService } from "../services/exa-search-service";
import { VisionService } from "../services/vision-service";
import { geocodeFirstAvailable } from "../utils/geocoding-utils";

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
    yield* Effect.log("Starting analysis for image", { imageId });
    const deployment = process.env.NEXT_PUBLIC_CONVEX_URL;

    if (!deployment) {
      yield* Effect.logError("NEXT_PUBLIC_CONVEX_URL not configured");
      return {
        success: false,
        error: "Convex not configured. Run 'npx convex dev' first.",
      };
    }

    yield* Effect.log("Convex client initialized");
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

    yield* Effect.log("Calling VisionService.analyzeImage");
    const analysisResult = yield* visionService
      .analyzeImage(imageUrl, visionContext)
      .pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Effect.logError("Vision analysis failed", error);
            return yield* Effect.fail(error);
          }),
        ),
      );

    yield* Effect.log("Vision analysis completed", {
      hasDescription: !!analysisResult.description,
      landmarksCount: analysisResult.landmarks?.length || 0,
      objectsCount: analysisResult.objects?.length || 0,
    });

    // Exa fallback: If OpenAI didn't identify landmarks but found location clues, use Exa
    if (
      analysisResult.landmarks.length === 0 &&
      analysisResult.locationClues.length > 0 &&
      latitude &&
      longitude
    ) {
      yield* Effect.log(
        "No landmarks from OpenAI, trying Exa fallback with location clues",
        {
          cluesCount: analysisResult.locationClues.length,
          latitude,
          longitude,
        },
      );

      const exaService = yield* ExaSearchService;
      const exaLandmarks = yield* exaService
        .identifyLandmarkFromClues(
          analysisResult.locationClues,
          latitude,
          longitude,
        )
        .pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Effect.logWarning("Exa landmark identification failed", {
                error,
              });
              return [];
            }),
          ),
        );

      if (exaLandmarks.length > 0) {
        yield* Effect.log("Exa identified landmarks", {
          landmarks: exaLandmarks,
        });
        analysisResult.landmarks = [
          ...analysisResult.landmarks,
          ...exaLandmarks,
        ];
      } else {
        yield* Effect.log("Exa did not identify any landmarks");
      }
    }

    // Try to geocode landmarks or location clues to get precise location
    let geocodedLocation: { latitude: number; longitude: number } | null = null;
    const mapboxToken = yield* Config.string("MAPBOX_ACCESS_TOKEN").pipe(
      Config.withDefault(""),
    );

    if (mapboxToken) {
      // Build list of location names to try geocoding (landmarks first, then location clues)
      const locationsToGeocode: string[] = [
        ...analysisResult.landmarks,
        ...analysisResult.locationClues,
      ].filter((loc) => loc && loc.trim() !== "");

      if (locationsToGeocode.length > 0) {
        yield* Effect.log("Attempting to geocode landmarks/clues", {
          count: locationsToGeocode.length,
          locations: locationsToGeocode.slice(0, 3), // Log first 3
        });

        const geocoded = yield* geocodeFirstAvailable(
          locationsToGeocode,
          mapboxToken,
        ).pipe(Effect.catchAll(() => Effect.succeed(null)));

        if (geocoded) {
          geocodedLocation = {
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
          };
          yield* Effect.log("Successfully geocoded location", {
            placeName: geocoded.placeName,
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
          });
        }
      }
    }

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

    // Convert the vision results to analyzedObjects format
    const analyzedObjects: Array<{
      name: string;
      confidence?: number;
      bearing?: number;
      distance?: number;
      description?: string;
    }> = [];

    // Add landmarks as analyzed objects
    if (analysisResult.landmarks && analysisResult.landmarks.length > 0) {
      for (const landmark of analysisResult.landmarks) {
        analyzedObjects.push({
          name: landmark,
          confidence: 0.8, // Default confidence for landmarks
          description: "Landmark identified in image",
        });
      }
    }

    // Add detected objects
    if (analysisResult.objects && analysisResult.objects.length > 0) {
      for (const object of analysisResult.objects) {
        analyzedObjects.push({
          name: object,
          confidence: 0.7, // Default confidence for objects
          description: "Object detected in scene",
        });
      }
    }

    // Add location clues as special objects
    if (
      analysisResult.locationClues &&
      analysisResult.locationClues.length > 0
    ) {
      for (const clue of analysisResult.locationClues) {
        analyzedObjects.push({
          name: clue,
          confidence: 0.6,
          description: "Location indicator or signage",
        });
      }
    }

    // Image is safe, update with analysis
    yield* Effect.log("Saving analysis to Convex", {
      imageId,
      analysisLength: formattedAnalysis.length,
      analyzedObjectsCount: analyzedObjects.length,
      hasGeocodedLocation: !!geocodedLocation,
    });

    yield* Effect.tryPromise({
      try: () =>
        client.mutation(api.capturedImages.updateImageAnalysis, {
          imageId: imageId as Id<"capturedImages">,
          analysis: formattedAnalysis,
          analyzedObjects:
            analyzedObjects.length > 0 ? analyzedObjects : undefined,
          status: "completed",
          // Update image location with geocoded coordinates if available
          latitude: geocodedLocation?.latitude,
          longitude: geocodedLocation?.longitude,
        }),
      catch: (error) => ({
        _tag: "ConvexError" as const,
        message: `Failed to save analysis: ${error}`,
      }),
    }).pipe(
      Effect.tap(() =>
        Effect.log("Successfully completed analysis", {
          imageId,
          locationUpdated: !!geocodedLocation,
        }),
      ),
    );

    yield* Effect.log("Analysis and moderation complete", { imageId });

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
        yield* Effect.logError("Moderate and analyze image failed", error);

        const errorMessage =
          typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : String(error);

        // Update image status to failed in Convex
        const deployment = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (deployment) {
          const client = new ConvexHttpClient(deployment);
          yield* Effect.tryPromise({
            try: () =>
              client.mutation(api.capturedImages.updateImageAnalysis, {
                imageId: imageId as Id<"capturedImages">,
                analysis: `Error: ${errorMessage}`,
                status: "failed",
              }),
            catch: (updateError) => ({
              _tag: "ConvexError" as const,
              message: `Failed to update error status: ${updateError}`,
            }),
          }).pipe(
            Effect.catchAll((convexError) =>
              Effect.gen(function* () {
                yield* Effect.logError(
                  "Failed to update error status in Convex",
                  convexError,
                );
              }),
            ),
          );
        }

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
