"use server";

import { ConvexHttpClient } from "convex/browser";
import { Effect } from "effect";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { runServerEffectAsync } from "../server-runtime";
import { VisionService } from "../services/vision-service";
import { WeatherService } from "../services/weather-service";

/**
 * Effect program for analyzing an image using OpenAI Vision API with location context
 */
const analyzeImageEffect = (
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

    yield* Effect.log(`Analyzing image: ${imageId}`);
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

    // Fetch current weather data if we have location
    let weatherData:
      | { temperature: number; humidity: number; timestamp: string }
      | undefined;

    if (latitude !== undefined && longitude !== undefined) {
      yield* Effect.log(
        `Fetching weather data for location: ${latitude}, ${longitude}`,
      );
      const weatherService = yield* WeatherService;
      weatherData = yield* weatherService
        .getCurrentWeather(latitude, longitude)
        .pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Effect.logWarning(
                "Failed to fetch weather data, continuing without it",
                error,
              );
              return undefined;
            }),
          ),
        );
    }

    // Build context for Vision API
    const visionContext = weatherData
      ? {
          latitude,
          longitude,
          temperature: weatherData.temperature,
          humidity: weatherData.humidity,
          timestamp: weatherData.timestamp,
        }
      : latitude && longitude
        ? { latitude, longitude, timestamp: new Date().toISOString() }
        : undefined;

    // Call VisionService to analyze the image with context
    const visionService = yield* VisionService;
    const analysisResult = yield* visionService
      .analyzeImage(imageUrl, visionContext)
      .pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Effect.logError("Vision analysis failed:", error);

            // Update with error status
            yield* Effect.tryPromise({
              try: () =>
                client.mutation(api.capturedImages.updateImageAnalysis, {
                  imageId: imageId as Id<"capturedImages">,
                  analysis: `Analysis failed: ${error.message}`,
                  status: "failed",
                }),
              catch: () => ({
                _tag: "ConvexError" as const,
                message: "Failed to update error status",
              }),
            });

            return yield* Effect.fail(error);
          }),
        ),
      );

    // Format the analysis result with enhanced details
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

    if (analysisResult.timeOfDay && analysisResult.timeOfDay !== "unknown") {
      formattedAnalysis += `\n\n🕐 Time of Day: ${analysisResult.timeOfDay}`;
    }

    if (weatherData) {
      formattedAnalysis += `\n\n🌡️ Temperature: ${weatherData.temperature.toFixed(1)}°C | Humidity: ${weatherData.humidity.toFixed(0)}%`;
    }

    if (
      analysisResult.weatherCondition &&
      analysisResult.weatherCondition !== "unknown"
    ) {
      formattedAnalysis += `\n\n☁️ Visible Weather: ${analysisResult.weatherCondition}`;
    }

    if (analysisResult.safetyNotes) {
      formattedAnalysis += `\n\n⚠️ Safety Notes: ${analysisResult.safetyNotes}`;
    }

    if (latitude && longitude) {
      formattedAnalysis += `\n\n📌 GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    }

    // Update Convex with the analysis result
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

    return { success: true, analysis: formattedAnalysis };
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError("Analyze image failed:", error);

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
 * Server Action: Analyze a captured image using OpenAI Vision API with location context
 *
 * Takes an image ID, URL, and optional GPS coordinates. Fetches real-time weather data
 * and passes comprehensive context to the AI for enhanced geolocation analysis.
 */
export async function analyzeImageAction(
  imageId: string,
  imageUrl: string,
  latitude?: number,
  longitude?: number,
): Promise<{ success: boolean; error?: string; analysis?: string }> {
  return await runServerEffectAsync(
    analyzeImageEffect(imageId, imageUrl, latitude, longitude),
  );
}
