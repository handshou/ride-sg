import { Config, Effect } from "effect";
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

export interface VisionAnalysisResult {
  description: string;
  landmarks?: string[];
  objects?: string[];
  sceneType?: string;
  safetyNotes?: string;
  locationClues?: string[]; // Visual clues for geolocation
  timeOfDay?:
    | "dawn"
    | "morning"
    | "afternoon"
    | "evening"
    | "night"
    | "unknown";
  weatherCondition?: string;
}

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
      const _config = yield* ConfigService;
      const openaiApiKey = yield* Config.string("OPENAI_API_KEY").pipe(
        Config.withDefault(""),
        Config.withDescription(
          "OpenAI API key for Vision API - server-side only",
        ),
      );

      yield* Effect.logDebug("🔍 VisionService initialized");

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
          Effect.tryPromise({
            try: async () => {
              if (!openaiApiKey) {
                throw new VisionServiceError(
                  "NO_API_KEY",
                  "OpenAI API key not configured. Set OPENAI_API_KEY environment variable.",
                );
              }

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

              const response = await fetch(
                "https://api.openai.com/v1/chat/completions",
                {
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
                },
              );

              if (!response.ok) {
                const errorData = await response.json();
                throw new VisionServiceError(
                  "API_ERROR",
                  `OpenAI API error: ${errorData.error?.message || response.statusText}`,
                );
              }

              const data = await response.json();
              const content = data.choices[0]?.message?.content;

              if (!content) {
                throw new VisionServiceError(
                  "NO_CONTENT",
                  "No analysis result from OpenAI",
                );
              }

              // Try to parse as JSON, fallback to plain text
              try {
                const parsed = JSON.parse(content);
                return {
                  description: parsed.description || content,
                  landmarks: parsed.landmarks || [],
                  locationClues: parsed.locationClues || [],
                  objects: parsed.objects || [],
                  sceneType: parsed.sceneType || "unknown",
                  timeOfDay: parsed.timeOfDay || "unknown",
                  weatherCondition: parsed.weatherCondition || "unknown",
                  safetyNotes: parsed.safetyNotes || "",
                } as VisionAnalysisResult;
              } catch {
                // If not JSON, return as plain description
                return {
                  description: content,
                  landmarks: [],
                  locationClues: [],
                  objects: [],
                  sceneType: "unknown",
                  timeOfDay: "unknown",
                  weatherCondition: "unknown",
                  safetyNotes: "",
                } as VisionAnalysisResult;
              }
            },
            catch: (error) => {
              if (error instanceof VisionServiceError) {
                return error;
              }
              return new VisionServiceError(
                "ANALYSIS_FAILED",
                `Image analysis failed: ${error}`,
              );
            },
          }),
      };
    }),
    dependencies: [ConfigService.Default],
  },
) {}
