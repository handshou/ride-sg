import { Context, Effect, Schema } from "effect";
import {
  type ExaAnswerResponse,
  type ExtractedLocationEntry,
  ExtractedLocationEntrySchema,
  normalizeExaAnswerResponse,
  PartialExaAnswerResponseSchema,
} from "../schema/exa-answer.schema";
import {
  normalizeSearchResult,
  PartialSearchResultSchema,
} from "../schema/search-result.schema";
import type { AppConfig } from "./config-service";
import { ConfigService } from "./config-service";
import type { SearchResult } from "./search-state-service";
import { SearchStateService } from "./search-state-service";

/**
 * Maximum number of search results to request and extract from Exa
 */
const MAX_EXA_SEARCH_RESULTS = 25;

/**
 * Exa API Error
 */
export class ExaError {
  readonly _tag = "ExaError";
  constructor(readonly message: string) {}
}

/**
 * Exa Search Service Interface (for legacy compatibility)
 */
export interface IExaSearchService {
  search: (
    query: string,
  ) => Effect.Effect<SearchResult[], ExaError, SearchStateService>;
}

/**
 * Mapbox Geocoding Response Types
 */
interface MapboxFeature {
  center: [number, number]; // [longitude, latitude]
  place_name: string;
  context?: Array<{ id: string; text: string }>;
}

interface MapboxGeocodingResponse {
  features: MapboxFeature[];
}

/**
 * Implementation of Exa Search Service using Answer API
 */
class ExaSearchServiceImpl {
  constructor(private readonly config: AppConfig) {}
  /**
   * Geocode a location name to coordinates using Mapbox
   */
  geocodeLocation(
    locationName: string,
    mapboxToken: string,
  ): Effect.Effect<{ latitude: number; longitude: number } | null> {
    return Effect.gen(function* () {
      // Add Singapore bias to the query for better results
      const query = `${locationName} Singapore`;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=SG&limit=1`;

      const response = yield* Effect.tryPromise({
        try: () => fetch(url),
        catch: (error) => new ExaError(`Geocoding fetch failed: ${error}`),
      });

      if (!response.ok) {
        yield* Effect.logWarning(
          `Geocoding failed for "${locationName}": ${response.status}`,
        );
        return null;
      }

      const data: MapboxGeocodingResponse = yield* Effect.tryPromise({
        try: () => response.json(),
        catch: (error) => new ExaError(`Geocoding parse failed: ${error}`),
      });

      if (data.features.length === 0) {
        yield* Effect.logWarning(`No geocoding results for "${locationName}"`);
        return null;
      }

      const [longitude, latitude] = data.features[0].center;
      return { latitude, longitude };
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.logError(
            `Geocoding error for "${locationName}"`,
            error,
          );
          return null;
        }),
      ),
    );
  }

  /**
   * Clean description by removing URL artifacts, brackets, and extra whitespace
   */
  cleanDescription(text: string): string {
    return text
      .replace(/\[[\d]+\]/g, "") // Remove citation brackets [1], [2], etc.
      .replace(/\(https?:\/\/[^)]+\)/g, "") // Remove URLs in parentheses
      .replace(/\[https?:\/\/[^\]]+\]/g, "") // Remove URLs in brackets
      .replace(/https?:\/\/[^\s]+/g, "") // Remove standalone URLs
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }

  /**
   * Clean markdown formatting from text (bold, italic, etc.)
   */
  cleanMarkdown(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold **text**
      .replace(/\*(.+?)\*/g, "$1") // Remove italic *text*
      .replace(/__(.+?)__/g, "$1") // Remove bold __text__
      .replace(/_(.+?)_/g, "$1") // Remove italic _text_
      .trim();
  }

  /**
   * Calculate confidence score for a search result
   * Returns 0-1, where 1 is highest confidence
   */
  private calculateConfidence(entry: {
    name: string;
    searchQuery: string;
    description: string;
  }): number {
    let score = 0.5; // Base score

    // Good indicators (increase score)
    const hasAddress =
      /\d+\s+\w+\s+(Road|Street|Avenue|Drive|Boulevard|Lane|Way|Singapore)/i.test(
        entry.searchQuery,
      );
    const hasPostalCode = /\d{6}/.test(entry.searchQuery);
    const hasGoodDesc =
      entry.description.length >= 20 && entry.description.length <= 200;
    const hasSpecificName =
      entry.name.length >= 3 &&
      !/^(location|place|area|spot)$/i.test(entry.name);

    if (hasAddress) score += 0.2;
    if (hasPostalCode) score += 0.15;
    if (hasGoodDesc) score += 0.1;
    if (hasSpecificName) score += 0.05;

    // Bad indicators (decrease score)
    const isGeneric =
      /^(unnamed|unknown|n\/a|not available|singapore|landmark)$/i.test(
        entry.name,
      );
    const hasNoDesc = entry.description.length < 10;

    if (isGeneric) score -= 0.3;
    if (hasNoDesc) score -= 0.2;

    return Math.max(0, Math.min(1, score)); // Clamp to 0-1
  }

  /**
   * Validate and create an ExtractedLocationEntry
   * Returns Effect that resolves to validated entry or null if validation fails
   */
  private validateEntry(
    entry: unknown,
  ): Effect.Effect<ExtractedLocationEntry | null> {
    return Effect.gen(function* () {
      try {
        return Schema.decodeUnknownSync(ExtractedLocationEntrySchema)(entry);
      } catch (error) {
        // Log validation error for debugging but don't throw
        yield* Effect.logWarning(
          `Failed to validate extracted entry: ${error instanceof Error ? error.message : String(error)}`,
        );
        return null;
      }
    });
  }

  /**
   * Validate and create a SearchResult
   * Returns Effect that resolves to validated result or null if validation fails
   */
  private validateSearchResult(
    result: unknown,
  ): Effect.Effect<SearchResult | null> {
    return Effect.gen(function* () {
      try {
        // Decode as partial result
        const partialResult = Schema.decodeUnknownSync(
          PartialSearchResultSchema,
        )(result);
        // Normalize to complete result with defaults
        return normalizeSearchResult(partialResult);
      } catch (error) {
        // Log validation error for debugging but don't throw
        yield* Effect.logWarning(
          `Failed to validate search result: ${error instanceof Error ? error.message : String(error)}`,
        );
        return null;
      }
    });
  }

  /**
   * Extract location entries from Exa Answer response
   * Parses structured format: "Name | Address | Description"
   * Returns validated objects with name, searchQuery, description, address, and confidence score
   */
  extractLocationEntries(
    answer: string,
  ): Effect.Effect<ExtractedLocationEntry[]> {
    const self = this;
    return Effect.gen(function* () {
      // Split by numbered lines (1. 2. 3.) or bullet points
      const lines = answer.split(/\n\s*[\d]+\.\s*|\n\s*[•-]\s*/);

      const entries: ExtractedLocationEntry[] = [];

      for (const line of lines) {
        if (line.trim().length < 10) continue; // Skip short lines

        // Try to parse structured format: "Name | Address | Description"
        const parts = line.split("|").map((p) => p.trim());

        if (parts.length >= 2) {
          // Structured format found
          const rawName = parts[0].trim();
          const address = parts[1].trim();
          const rawDescription = parts[2]?.trim() || "";

          // Clean markdown formatting from name
          const name = self.cleanMarkdown(rawName);

          if (name.length < 3) continue;

          // Clean description and calculate confidence
          const description = self.cleanDescription(rawDescription);
          const searchQuery = `${name}, ${address}`;
          const confidence = self.calculateConfidence({
            name,
            searchQuery,
            description,
          });

          // Validate and add entry
          const validatedEntry = yield* self.validateEntry({
            name,
            searchQuery,
            description,
            address,
            confidence,
          });
          if (validatedEntry) {
            entries.push(validatedEntry);
          }
        } else {
          // Fallback: try to parse unstructured format
          // Extract name (first part before comma, colon, dash, or "at")
          const nameMatch = line.match(
            /^([^,:\-|]+?)(?:\s+at|\s+-|\s+,|\s+\|)/i,
          );
          if (!nameMatch) continue;

          const rawName = nameMatch[1].trim();
          const name = self.cleanMarkdown(rawName);

          // Skip if too short or generic
          if (
            name.length < 3 ||
            /^(and|or|the|in|at|near|Singapore|landmark|location|place|here|are|top|famous|find|list)$/i.test(
              name,
            )
          ) {
            continue;
          }

          // Extract address (look for street patterns, postal codes)
          const addressMatch = line.match(
            /(?:at|located|address|:)\s*([^,\n]+?(?:Road|Street|Avenue|Drive|Boulevard|Lane|Way|Singapore\s+\d{6}|\d{6}))/i,
          );

          // Extract description (remaining text, up to 100 chars)
          const descMatch = line.match(/[:\-|]\s*(.+)$/);
          const rawDescription = descMatch?.[1]?.trim().substring(0, 100) || "";
          const description = self.cleanDescription(rawDescription);

          // Use name + address for better geocoding
          const address = addressMatch ? addressMatch[1].trim() : "Singapore";
          const searchQuery = `${name}, ${address}, Singapore`;

          const confidence = self.calculateConfidence({
            name,
            searchQuery,
            description,
          });

          // Validate and add entry
          const validatedEntry = yield* self.validateEntry({
            name,
            searchQuery,
            description,
            address,
            confidence,
          });
          if (validatedEntry) {
            entries.push(validatedEntry);
          }
        }

        // Limit to maximum search results
        if (entries.length >= MAX_EXA_SEARCH_RESULTS) break;
      }

      return entries;
    });
  }

  /**
   * Search for Singapore landmarks using Exa Answer API
   * @param query - Search query
   * @param userLocation - Optional user location for location-based queries
   * @param locationName - Optional human-readable location name from reverse geocoding
   */
  search(
    query: string,
    userLocation?: { latitude: number; longitude: number },
    locationName?: string,
  ) {
    return Effect.gen(
      function* (this: ExaSearchServiceImpl) {
        const searchState = yield* SearchStateService;

        yield* searchState.startSearch(query);

        const exaApiKey = this.config.exa.apiKey;
        const mapboxToken = this.config.mapbox.token;

        // Fallback to mock data if API key not configured
        if (!exaApiKey || exaApiKey === "") {
          yield* Effect.logWarning(
            "EXA_API_KEY not configured, using mock data",
          );
          const mockData = [
            {
              id: `exa-${Date.now()}-1`,
              title: "Marina Bay Sands",
              description:
                "Iconic integrated resort with rooftop infinity pool (mock data - configure EXA_API_KEY)",
              location: {
                latitude: 1.2834,
                longitude: 103.8607,
              },
              source: "exa" as const,
              timestamp: Date.now(),
            },
            {
              id: `exa-${Date.now()}-2`,
              title: "Gardens by the Bay",
              description:
                "Nature park with futuristic Supertree structures (mock data - configure EXA_API_KEY)",
              location: {
                latitude: 1.2816,
                longitude: 103.8636,
              },
              source: "exa" as const,
              timestamp: Date.now(),
            },
          ];
          // Validate mock results
          const validatedMockResults = yield* Effect.all(
            mockData.map((data) => this.validateSearchResult(data)),
          );
          const mockResults = validatedMockResults.filter(
            (r): r is SearchResult => r !== null,
          );
          yield* searchState.setResults(mockResults);
          yield* searchState.completeSearch();
          return mockResults;
        }

        yield* Effect.log(
          `Searching Exa Answer API for Singapore landmarks: "${query}"`,
        );

        // Add location context: use reverse-geocoded name if available, otherwise just "in Singapore"
        const locationContext = locationName
          ? `near ${locationName}`
          : userLocation
            ? `near ${userLocation.latitude}, ${userLocation.longitude} (coordinates) in Singapore`
            : "in Singapore";

        // Concise query focused on essential location data
        const enhancedQuery = `Find up to ${MAX_EXA_SEARCH_RESULTS} locations for "${query}" ${locationContext}. For each, list:
Name | Full Address | Brief description (max 8 words)

Example format:
1. Marina Bay Sands | 10 Bayfront Ave, Singapore 018956 | Iconic hotel with rooftop pool`;

        // Call Exa Answer API
        const response = yield* Effect.tryPromise({
          try: () =>
            fetch("https://api.exa.ai/answer", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": exaApiKey,
              },
              body: JSON.stringify({
                query: enhancedQuery,
                num_sources: MAX_EXA_SEARCH_RESULTS,
                use_autoprompt: true,
              }),
            }),
          catch: (error) =>
            new ExaError(`Exa Answer API fetch failed: ${error}`),
        });

        if (!response.ok) {
          const errorText = yield* Effect.tryPromise({
            try: () => response.text(),
            catch: () => "Unknown error",
          });
          yield* Effect.logError(
            `Exa Answer API error: ${response.status} - ${errorText}`,
          );
          return yield* Effect.fail(
            new ExaError(`Exa Answer API returned ${response.status}`),
          );
        }

        // Parse response as JSON
        const rawData = yield* Effect.tryPromise({
          try: () => response.json(),
          catch: (error) =>
            new ExaError(`Failed to parse Exa response: ${error}`),
        });

        // Decode and validate using Effect.Schema (partial)
        const partialAnswerData = yield* Effect.try({
          try: () =>
            Schema.decodeUnknownSync(PartialExaAnswerResponseSchema)(rawData),
          catch: (error) =>
            new ExaError(
              `Schema validation failed: ${error instanceof Error ? error.message : String(error)}`,
            ),
        });

        // Normalize to complete response with defaults
        const answerData: ExaAnswerResponse =
          normalizeExaAnswerResponse(partialAnswerData);

        yield* Effect.log(
          `Exa Answer received: "${answerData.answer.substring(0, 150)}..."`,
        );
        if (answerData.sources.length > 0) {
          yield* Effect.log(
            `Exa sources: ${answerData.sources.length} sources`,
          );
        }

        // Extract location entries from the answer
        const locationEntries = yield* this.extractLocationEntries(
          answerData.answer,
        );

        yield* Effect.log(
          `Extracted ${locationEntries.length} locations from Exa: ${locationEntries.map((e) => e.name).join(", ")}`,
        );

        if (locationEntries.length === 0) {
          yield* Effect.logWarning(
            `Exa returned answer but no locations could be extracted. Answer was: "${answerData.answer.substring(0, 200)}"`,
          );
        }

        // Geocode each location
        const exaResults: SearchResult[] = [];

        for (const entry of locationEntries) {
          yield* Effect.log(
            `Geocoding Exa result: "${entry.searchQuery}" (confidence: ${(entry.confidence * 100).toFixed(0)}%)`,
          );

          const coordinates = yield* this.geocodeLocation(
            entry.searchQuery,
            mapboxToken,
          );

          if (coordinates) {
            yield* Effect.log(
              `✓ Geocoded "${entry.name}" to (${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)})`,
            );
          } else {
            yield* Effect.logWarning(
              `✗ Geocoding failed for "${entry.name}" using query "${entry.searchQuery}"`,
            );
          }

          if (coordinates) {
            // Clean description from entry or fallback to source
            const firstSource = answerData.sources[0];
            const cleanedSourceDesc = firstSource?.content
              ? this.cleanDescription(firstSource.content.substring(0, 150))
              : "";
            const description =
              entry.description ||
              cleanedSourceDesc ||
              "Singapore location (via Exa Answer API)";

            // Extract URL from sources if available
            const url = firstSource?.url ?? "";

            // Validate and add search result
            const validatedResult = yield* this.validateSearchResult({
              id: `exa-${Date.now()}-${exaResults.length}`,
              title: entry.name,
              description,
              location: coordinates,
              source: "exa" as const,
              timestamp: Date.now(),
              address: entry.address, // Add address including postal code
              url, // Add URL if available
            });

            if (validatedResult) {
              exaResults.push(validatedResult);
            }
          }
        }

        yield* searchState.setResults(exaResults);
        yield* searchState.completeSearch();

        yield* Effect.log(
          `Exa Answer search completed: ${exaResults.length} results with coordinates`,
        );

        return exaResults;
      }.bind(this),
    ).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          const searchState = yield* SearchStateService;
          const errorMessage =
            error && typeof error === "object" && "message" in error
              ? String((error as { message: unknown }).message)
              : "Exa Answer search failed";
          yield* searchState.setError(errorMessage);
          yield* Effect.logError("Exa Answer search error", error);
          return yield* Effect.fail(
            new ExaError("Failed to search Exa Answer API"),
          );
        }),
      ),
    );
  }

  /**
   * Identify landmarks from location clues using Exa
   * Fallback when OpenAI Vision doesn't identify specific landmarks
   */
  identifyLandmarkFromClues(
    locationClues: string[],
    latitude: number,
    longitude: number,
  ): Effect.Effect<string[], ExaError> {
    return Effect.gen(
      function* (this: ExaSearchServiceImpl) {
        const exaApiKey = this.config.exa.apiKey;

        if (!exaApiKey) {
          yield* Effect.logWarning(
            "EXA_API_KEY not configured, cannot identify landmarks",
          );
          return [];
        }

        yield* Effect.log(
          "Identifying landmarks from location clues with Exa",
          {
            cluesCount: locationClues.length,
            latitude,
            longitude,
          },
        );

        // Build query from location clues + GPS
        const cluesText = locationClues.join(", ");
        const query = `What landmark building or location is at coordinates ${latitude}, ${longitude} in Singapore with these features: ${cluesText}? Give me the specific landmark name.`;

        yield* Effect.log("Exa landmark query", { query });

        // Call Exa Answer API
        const response = yield* Effect.tryPromise({
          try: () =>
            fetch("https://api.exa.ai/answer", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": exaApiKey,
              },
              body: JSON.stringify({
                query,
                num_sources: 5,
                use_autoprompt: true,
              }),
            }),
          catch: (error) =>
            new ExaError(`Exa landmark identification failed: ${error}`),
        });

        if (!response.ok) {
          yield* Effect.logWarning(
            `Exa landmark API returned ${response.status}`,
          );
          return [];
        }

        const rawData = yield* Effect.tryPromise({
          try: () => response.json(),
          catch: (error) =>
            new ExaError(`Failed to parse Exa response: ${error}`),
        });

        // Decode and normalize response
        const partialAnswerData = yield* Effect.try({
          try: () =>
            Schema.decodeUnknownSync(PartialExaAnswerResponseSchema)(rawData),
          catch: (error) =>
            new ExaError(`Failed to decode Exa answer response: ${error}`),
        }).pipe(Effect.catchAll(() => Effect.succeed({ answer: "" })));

        const answerData = normalizeExaAnswerResponse(partialAnswerData);

        yield* Effect.log("Exa landmark response", {
          answer: answerData.answer.substring(0, 200),
        });

        // Parse landmark names from the answer
        // Look for quoted strings or capitalize words that look like landmark names
        const landmarks: string[] = [];

        // Extract quoted strings (most reliable)
        const quotedMatches = answerData.answer.match(/"([^"]+)"/g);
        if (quotedMatches) {
          for (const match of quotedMatches) {
            const cleaned = match.replace(/"/g, "").trim();
            if (cleaned.length > 3) {
              landmarks.push(cleaned);
            }
          }
        }

        // Extract sentences mentioning specific places (fallback)
        if (landmarks.length === 0) {
          const sentences = answerData.answer.split(/[.!?]/);
          for (const sentence of sentences) {
            // Look for patterns like "Marina Bay Sands" (title case sequences)
            const titleCaseMatches = sentence.match(
              /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g,
            );
            if (titleCaseMatches) {
              landmarks.push(...titleCaseMatches);
            }
          }
        }

        yield* Effect.log("Identified landmarks from Exa", {
          count: landmarks.length,
          landmarks: landmarks.slice(0, 3),
        });

        return landmarks.slice(0, 3); // Return top 3 most likely landmarks
      }.bind(this),
    );
  }
}

/**
 * ExaSearchService as Effect.Service
 * Provides auto-generated accessors and cleaner DI
 */
export class ExaSearchService extends Effect.Service<ExaSearchService>()(
  "ExaSearchService",
  {
    effect: Effect.gen(function* () {
      const config = yield* ConfigService;
      return new ExaSearchServiceImpl(config);
    }),
    dependencies: [ConfigService.Default, SearchStateService.Default],
  },
) {}

/**
 * Legacy export for ExaSearchServiceTag (for backwards compatibility during migration)
 * This will be removed once all services are migrated
 */
export const ExaSearchServiceTag =
  Context.GenericTag<IExaSearchService>("ExaSearchService");
