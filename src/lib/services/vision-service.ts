import { Effect, Schema } from "effect";
import { ConfigService } from "./config-service";

/**
 * Vision Service for AI-powered image analysis
 *
 * Uses OpenAI's Vision API (GPT-4 Vision) to analyze captured images
 * and extract meaningful descriptions about:
 * - Scene type (indoor/outdoor, urban/nature)
 * - Objects and landmarks
 * - Activities and events
 * - Text visible in the image
 * - Relevant safety or accessibility information for cyclists
 */

/**
 * Schema for OpenAI Vision API response with strict defaults
 */
const VisionAnalysisResultSchema = Schema.Struct({
  description: Schema.String,
  landmarks: Schema.Array(Schema.String),
  locationClues: Schema.Array(Schema.String),
  objects: Schema.Array(Schema.String),
  sceneType: Schema.String,
  timeOfDay: Schema.String,
  weatherCondition: Schema.String,
  safetyNotes: Schema.String,
}).pipe(
  Schema.annotations({
    identifier: "VisionAnalysisResult",
    description: "OpenAI Vision API analysis result",
  }),
);

/**
 * Schema for partial OpenAI response (allows missing fields)
 */
const PartialVisionResponseSchema = Schema.Struct({
  description: Schema.String,
  landmarks: Schema.Array(Schema.String).pipe(Schema.optional),
  locationClues: Schema.Array(Schema.String).pipe(Schema.optional),
  objects: Schema.Array(Schema.String).pipe(Schema.optional),
  sceneType: Schema.String.pipe(Schema.optional),
  timeOfDay: Schema.String.pipe(Schema.optional),
  weatherCondition: Schema.String.pipe(Schema.optional),
  safetyNotes: Schema.String.pipe(Schema.optional),
});

/**
 * Transform partial response to complete result with defaults
 */
const normalizeVisionResponse = (
  partial: Schema.Schema.Type<typeof PartialVisionResponseSchema>,
): VisionAnalysisResult => ({
  description: partial.description,
  landmarks: partial.landmarks ?? [],
  locationClues: partial.locationClues ?? [],
  objects: partial.objects ?? [],
  sceneType: partial.sceneType ?? "unknown",
  timeOfDay: partial.timeOfDay ?? "unknown",
  weatherCondition: partial.weatherCondition ?? "unknown",
  safetyNotes: partial.safetyNotes ?? "",
});

export interface VisionAnalysisResult
  extends Schema.Schema.Type<typeof VisionAnalysisResultSchema> {}

export class VisionServiceError {
  constructor(
    public readonly code: string,
    public readonly message: string,
  ) {}
}

/**
 * VisionService as Effect.Service
 * Provides AI-powered image analysis using OpenAI Vision API
 */
export class VisionService extends Effect.Service<VisionService>()(
  "VisionService",
  {
    effect: Effect.gen(function* () {
      const config = yield* ConfigService;
      const openaiApiKey = config.openai.apiKey;

      yield* Effect.logDebug("🔍 VisionService initialized", {
        hasApiKey: !!openaiApiKey,
        apiKeyLength: openaiApiKey?.length || 0,
      });

      return {
        /**
         * Analyze an image and return AI-generated description with location context
         */
        analyzeImage: (
          imageUrl: string,
          context?: {
            latitude?: number;
            longitude?: number;
            temperature?: number;
            humidity?: number;
            timestamp?: string;
          },
        ) =>
          Effect.gen(function* () {
            if (!openaiApiKey) {
              yield* Effect.logError(
                "NO_API_KEY: OPENAI_API_KEY environment variable is not set",
              );
              throw new VisionServiceError(
                "NO_API_KEY",
                "OpenAI API key not configured. Set OPENAI_API_KEY environment variable.",
              );
            }

            yield* Effect.log("Starting image analysis", {
              imageUrl: `${imageUrl.substring(0, 50)}...`,
              hasContext: !!context,
              hasLocation: !!(context?.latitude && context?.longitude),
            });

            // Build context message with available data
            let contextMessage =
              "Analyze this image captured in Singapore and help identify the location.";

            if (context?.latitude && context?.longitude) {
              contextMessage += ` GPS coordinates: ${context.latitude.toFixed(5)}, ${context.longitude.toFixed(5)}.`;
            }

            if (context?.temperature !== undefined) {
              contextMessage += ` Current temperature: ${context.temperature.toFixed(1)}°C.`;
            }

            if (context?.humidity !== undefined) {
              contextMessage += ` Humidity: ${context.humidity.toFixed(0)}%.`;
            }

            if (context?.timestamp) {
              const time = new Date(context.timestamp);
              const hours = time.getHours();
              const timeOfDay =
                hours < 6
                  ? "early morning/night"
                  : hours < 12
                    ? "morning"
                    : hours < 17
                      ? "afternoon"
                      : hours < 20
                        ? "evening"
                        : "night";
              contextMessage += ` Time: ${time.toLocaleTimeString("en-SG")} (${timeOfDay}).`;
            }

            contextMessage += `\n\nFocus on:\n1. GEOLOCATION: Identify specific landmarks, street names, building names, signs, or distinctive features that could pinpoint this location\n2. ENVIRONMENT: Describe the surroundings, infrastructure, and environmental conditions\n3. TIME & WEATHER: Assess lighting conditions (dawn/day/dusk/night) and visible weather conditions\n4. SAFETY: Note any cycling-relevant safety information\n5. LOCATION CLUES: List all visible text, signage, or identifiable features`;

            const response = yield* Effect.tryPromise(() =>
              fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${openaiApiKey}`,
                },
                body: JSON.stringify({
                  model: "gpt-4o",
                  messages: [
                    {
                      role: "system",
                      content: `You are a geolocation expert AI analyzing images from Singapore to help identify precise locations. You have access to GPS coordinates and real-time environmental data to enhance your analysis.

Your analysis should prioritize:
- Identifying specific landmarks, buildings, street names from visible signage
- Recognizing distinctive architectural or environmental features
- Reading visible text on signs, storefronts, or street markers
- Assessing time of day from lighting and shadows
- Noting weather conditions visible in the image
- Providing cycling safety insights

Return your response as JSON with these keys:
- description (string): Detailed analysis of the scene
- landmarks (array): Specific identifiable landmarks or locations
- locationClues (array): All visible text, signs, distinctive features for geolocation
- objects (array): Notable objects in the scene
- sceneType (string): Type of environment (urban/residential/commercial/park/waterfront)
- timeOfDay (string): dawn/morning/afternoon/evening/night based on lighting
- weatherCondition (string): Visible weather conditions
- safetyNotes (string): Cycling safety observations

Be specific and detailed. If you can identify exact locations or street names from visible signs, mention them.`,
                    },
                    {
                      role: "user",
                      content: [
                        {
                          type: "text",
                          text: contextMessage,
                        },
                        {
                          type: "image_url",
                          image_url: {
                            url: imageUrl,
                            detail: "high",
                          },
                        },
                      ],
                    },
                  ],
                  max_tokens: 800,
                  temperature: 0.7,
                }),
              }),
            );

            if (!response.ok) {
              const errorData = yield* Effect.tryPromise(() => response.json());
              yield* Effect.logError("OpenAI API Error", {
                status: response.status,
                statusText: response.statusText,
                error: errorData,
              });
              throw new VisionServiceError(
                "API_ERROR",
                `OpenAI API error: ${errorData.error?.message || response.statusText}`,
              );
            }

            yield* Effect.log("OpenAI API response received");
            const data = yield* Effect.tryPromise(() => response.json());
            const content = data.choices[0]?.message?.content;

            if (!content) {
              yield* Effect.logError("No analysis result from OpenAI");
              throw new VisionServiceError(
                "NO_CONTENT",
                "No analysis result from OpenAI",
              );
            }

            // Strip markdown code blocks if present (```json ... ``` or ``` ... ```)
            let cleanedContent = content.trim();
            const jsonCodeBlockMatch = cleanedContent.match(
              /^```(?:json)?\s*\n([\s\S]*?)\n```$/,
            );
            if (jsonCodeBlockMatch) {
              cleanedContent = jsonCodeBlockMatch[1].trim();
              yield* Effect.log("Stripped markdown code blocks from response");
            }

            // Parse JSON with Effect Schema for validation
            const parseResult = yield* Effect.tryPromise({
              try: () => JSON.parse(cleanedContent),
              catch: (error) => ({
                _tag: "ParseError" as const,
                message: `Failed to parse JSON: ${error}`,
              }),
            }).pipe(
              Effect.catchAll((error) =>
                Effect.gen(function* () {
                  yield* Effect.logWarning("Failed to parse JSON", error);
                  // Return minimal valid structure with content as description
                  return { description: content };
                }),
              ),
            );

            // Decode partial response with Schema
            const partialResult = yield* Schema.decodeUnknown(
              PartialVisionResponseSchema,
            )(parseResult).pipe(
              Effect.catchAll((error) =>
                Effect.gen(function* () {
                  yield* Effect.logError("Schema validation failed", {
                    error: String(error),
                    parseResult,
                  });
                  // Fallback to minimal valid structure
                  return { description: content };
                }),
              ),
            );

            // Normalize to complete result with defaults
            const normalizedResult = normalizeVisionResponse(partialResult);

            yield* Effect.log("Successfully validated response", {
              hasDescription: !!normalizedResult.description,
              landmarksCount: normalizedResult.landmarks.length,
              objectsCount: normalizedResult.objects.length,
              locationCluesCount: normalizedResult.locationClues.length,
            });

            return normalizedResult;
          }).pipe(
            Effect.catchAll((error) =>
              Effect.gen(function* () {
                yield* Effect.logError("Analysis failed", {
                  error,
                  errorType:
                    error instanceof VisionServiceError
                      ? "VisionServiceError"
                      : typeof error,
                  errorMessage:
                    error instanceof Error ? error.message : String(error),
                });
                if (error instanceof VisionServiceError) {
                  return yield* Effect.fail(error);
                }
                return yield* Effect.fail(
                  new VisionServiceError(
                    "ANALYSIS_FAILED",
                    `Image analysis failed: ${error}`,
                  ),
                );
              }),
            ),
          ),
      };
    }),
    dependencies: [ConfigService.Default],
  },
) {}
