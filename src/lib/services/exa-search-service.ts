import { Context, Effect, Schema } from "effect";
import type { City } from "@/providers/city-provider";
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
   * Truncates long addresses to meet Mapbox's 20 token limit
   */
  geocodeLocation(
    locationName: string,
    mapboxToken: string,
    contextLocation?: string,
  ): Effect.Effect<{ latitude: number; longitude: number } | null> {
    return Effect.gen(function* () {
      // Detect if we're searching in Jakarta or Singapore
      const isJakarta =
        contextLocation?.toLowerCase().includes("jakarta") ||
        contextLocation?.toLowerCase().includes("indonesia") ||
        locationName.toLowerCase().includes("jakarta") ||
        locationName.toLowerCase().includes("indonesia");

      // Build query and country filter based on location
      const countryCode = isJakarta ? "ID" : "SG";

      // Truncate query to prevent "Query too long" errors (Mapbox limit: 20 tokens)
      // Keep the most important parts: name + street + postal code
      let query = locationName;

      // For Indonesian addresses, extract key components
      if (isJakarta) {
        // Try to extract: Name, main street (Jl./Jalan), and postal code
        const parts = query.split(",").map((p) => p.trim());

        // Keep first part (name) and any part with Jl./Jalan or postal code
        const importantParts = parts.filter((part, idx) => {
          if (idx === 0) return true; // Always keep name
          if (/Jl\.|Jalan/i.test(part)) return true; // Keep street
          if (/\d{5}/.test(part)) return true; // Keep postal code
          if (/Jakarta|Indonesia/i.test(part)) return true; // Keep city/country
          return false;
        });

        // Reconstruct query with essential parts only
        if (importantParts.length > 0 && importantParts.length < parts.length) {
          query = importantParts.slice(0, 4).join(", "); // Max 4 parts to stay under limit
          yield* Effect.logDebug(
            `Truncated Jakarta address from ${parts.length} parts to ${importantParts.slice(0, 4).length}`,
          );
        }
      }

      // Fallback: if still too long (>100 chars), truncate to first 100 chars
      if (query.length > 100) {
        query = query.substring(0, 100);
        yield* Effect.logDebug(`Truncated long query to 100 chars`);
      }

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=${countryCode}&limit=1`;

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
   * Jakarta results use more lenient scoring due to less structured online data
   */
  private calculateConfidence(
    entry: {
      name: string;
      searchQuery: string;
      description: string;
    },
    locationContext?: string,
  ): number {
    // Detect if this is Jakarta
    const isJakarta =
      locationContext?.toLowerCase().includes("jakarta") ||
      locationContext?.toLowerCase().includes("indonesia") ||
      entry.searchQuery.toLowerCase().includes("jakarta") ||
      entry.searchQuery.toLowerCase().includes("indonesia");

    // Jakarta gets higher base score due to less structured data available
    let score = isJakarta ? 0.55 : 0.5;

    // Good indicators (increase score)
    // Support both Singapore and Indonesian street patterns
    const hasAddress = isJakarta
      ? /\d+\s+\w+\s+(Jl\.|Jalan|Road|Street|Avenue)/i.test(entry.searchQuery)
      : /\d+\s+\w+\s+(Road|Street|Avenue|Drive|Boulevard|Lane|Way|Singapore)/i.test(
          entry.searchQuery,
        );

    // Support both 6-digit (Singapore) and 5-digit (Indonesia) postal codes
    const hasPostalCode = isJakarta
      ? /\d{5}/.test(entry.searchQuery)
      : /\d{6}/.test(entry.searchQuery);

    const hasGoodDesc =
      entry.description.length >= 20 && entry.description.length <= 200;
    const hasSpecificName =
      entry.name.length >= 3 &&
      !/^(location|place|area|spot)$/i.test(entry.name);

    // Jakarta addresses get slightly more lenient scoring
    const addressBonus = isJakarta ? 0.15 : 0.2;
    const postalBonus = isJakarta ? 0.1 : 0.15;

    if (hasAddress) score += addressBonus;
    if (hasPostalCode) score += postalBonus;
    if (hasGoodDesc) score += 0.1;
    if (hasSpecificName) score += 0.05;

    // Bad indicators (decrease score) - more lenient for Jakarta
    const isGeneric =
      /^(unnamed|unknown|n\/a|not available|singapore|jakarta|landmark)$/i.test(
        entry.name,
      );
    const hasNoDesc = entry.description.length < 10;

    const genericPenalty = isJakarta ? -0.25 : -0.3;
    const noDescPenalty = isJakarta ? -0.15 : -0.2;

    if (isGeneric) score += genericPenalty;
    if (hasNoDesc) score += noDescPenalty;

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
    locationContext?: string,
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
          const confidence = self.calculateConfidence(
            {
              name,
              searchQuery,
              description,
            },
            locationContext,
          );

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
          const cityFallback = locationContext?.includes("Jakarta") ? "Jakarta" : "Singapore";
          const address = addressMatch ? addressMatch[1].trim() : cityFallback;
          const searchQuery = `${name}, ${address}`;

          const confidence = self.calculateConfidence(
            {
              name,
              searchQuery,
              description,
            },
            locationContext,
          );

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
   * Search for landmarks using Exa Answer API
   * @param query - Search query
   * @param userLocation - Optional user location for location-based queries
   * @param locationName - Optional human-readable location name from reverse geocoding
   * @param city - City context (singapore or jakarta) for search filtering
   */
  search(
    query: string,
    userLocation?: { latitude: number; longitude: number },
    locationName?: string,
    city?: City,
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

        // Determine city context for search
        const cityContext =
          city === "jakarta" ? "in Jakarta, Indonesia" : "in Singapore";
        const cityName = city === "jakarta" ? "Jakarta" : "Singapore";

        yield* Effect.log(
          `Searching Exa Answer API for ${cityName} landmarks: "${query}"`,
        );

        // Add location context: use reverse-geocoded name if available, otherwise use city context
        const locationContext = locationName
          ? `near ${locationName} ${cityContext}`
          : userLocation
            ? `near ${userLocation.latitude}, ${userLocation.longitude} (coordinates) ${cityContext}`
            : cityContext;

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
          locationName,
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
            locationName,
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
              `${cityName} location (via Exa Answer API)`;

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
    city?: City,
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
        const cityName = city === "jakarta" ? "Jakarta" : "Singapore";
        const query = `What landmark building or location is at coordinates ${latitude}, ${longitude} in ${cityName} with these features: ${cluesText}? Give me the specific landmark name.`;

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
