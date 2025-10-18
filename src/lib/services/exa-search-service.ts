import { Context, Effect, Layer, Schema } from "effect";
import {
  type ExaAnswerResponse,
  ExaAnswerResponseSchema,
} from "../schema/exa-answer.schema";
import { exaApiKeyConfig, mapboxTokenConfig } from "./config-service";
import type { SearchResult, SearchStateService } from "./search-state-service";
import { SearchStateServiceTag } from "./search-state-service";

/**
 * Exa API Error
 */
export class ExaError {
  readonly _tag = "ExaError";
  constructor(readonly message: string) {}
}

/**
 * Exa Search Service
 *
 * Integrates with Exa.ai Answer API for semantic search of Singapore landmarks.
 * Uses Effect.Schema for type-safe response parsing.
 */
export interface ExaSearchService {
  search: (
    query: string,
  ) => Effect.Effect<SearchResult[], ExaError, SearchStateService>;
}

export const ExaSearchServiceTag =
  Context.GenericTag<ExaSearchService>("ExaSearchService");

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
export class ExaSearchServiceImpl implements ExaSearchService {
  /**
   * Geocode a location name to coordinates using Mapbox
   */
  private geocodeLocation(
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
   * Extract location entries from Exa Answer response
   * Parses structured format: "Name | Address | Description"
   * Returns objects with name, searchQuery, and description
   */
  private extractLocationEntries(
    answer: string,
  ): Array<{ name: string; searchQuery: string; description: string }> {
    // Split by numbered lines (1. 2. 3.) or bullet points
    const lines = answer.split(/\n\s*[\d]+\.\s*|\n\s*[•-]\s*/);

    const entries: Array<{
      name: string;
      searchQuery: string;
      description: string;
    }> = [];

    for (const line of lines) {
      if (line.trim().length < 10) continue; // Skip short lines

      // Try to parse structured format: "Name | Address | Description"
      const parts = line.split("|").map((p) => p.trim());

      if (parts.length >= 2) {
        // Structured format found
        const name = parts[0].trim();
        const address = parts[1].trim();
        const description = parts[2]?.trim() || "";

        if (name.length < 3) continue;

        // Use name + address for geocoding
        const searchQuery = `${name}, ${address}`;

        entries.push({ name, searchQuery, description });
      } else {
        // Fallback: try to parse unstructured format
        // Extract name (first part before comma, colon, dash, or "at")
        const nameMatch = line.match(/^([^,:\-|]+?)(?:\s+at|\s+-|\s+,|\s+\|)/i);
        if (!nameMatch) continue;

        const name = nameMatch[1].trim();

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
        const description = descMatch?.[1]?.trim().substring(0, 100) || "";

        // Use name + address for better geocoding
        const searchQuery = addressMatch
          ? `${name}, ${addressMatch[1].trim()}, Singapore`
          : `${name}, Singapore`;

        entries.push({ name, searchQuery, description });
      }

      // Limit to top 5
      if (entries.length >= 5) break;
    }

    return entries;
  }

  /**
   * Search for Singapore landmarks using Exa Answer API
   */
  search(query: string) {
    return Effect.gen(
      function* (this: ExaSearchServiceImpl) {
        const searchState = yield* SearchStateServiceTag;

        yield* searchState.startSearch(query);

        const exaApiKey = yield* exaApiKeyConfig;
        const mapboxToken = yield* mapboxTokenConfig;

        // Fallback to mock data if API key not configured
        if (!exaApiKey || exaApiKey === "") {
          yield* Effect.logWarning(
            "EXA_API_KEY not configured, using mock data",
          );
          const mockResults: SearchResult[] = yield* Effect.sync(() => [
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
          ]);
          yield* searchState.setResults(mockResults);
          yield* searchState.completeSearch();
          return mockResults;
        }

        yield* Effect.log(
          `Searching Exa Answer API for Singapore landmarks: "${query}"`,
        );

        // Concise query focused on essential location data
        const enhancedQuery = `Find 5 locations for "${query}" in Singapore. For each, list:
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
                num_sources: 3,
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

        // Decode and validate using Effect.Schema
        const answerData: ExaAnswerResponse = yield* Effect.try({
          try: () => Schema.decodeUnknownSync(ExaAnswerResponseSchema)(rawData),
          catch: (error) =>
            new ExaError(
              `Schema validation failed: ${error instanceof Error ? error.message : String(error)}`,
            ),
        });

        yield* Effect.log(
          `Exa Answer: "${answerData.answer.substring(0, 100)}..."`,
        );
        if (answerData.sources) {
          yield* Effect.log(`Sources: ${answerData.sources.length}`);
        }

        // Extract location entries from the answer
        const locationEntries = this.extractLocationEntries(answerData.answer);

        yield* Effect.log(
          `Extracted ${locationEntries.length} locations: ${locationEntries.map((e) => e.name).join(", ")}`,
        );

        // Geocode each location
        const exaResults: SearchResult[] = [];

        for (const entry of locationEntries) {
          yield* Effect.log(`Geocoding: "${entry.searchQuery}"`);

          const coordinates = yield* this.geocodeLocation(
            entry.searchQuery,
            mapboxToken,
          );

          if (coordinates) {
            // Use description from entry, or try to extract from answer, or use source content
            const description =
              entry.description ||
              answerData.sources?.[0]?.content.substring(0, 150) ||
              "Singapore location (via Exa Answer API)";

            exaResults.push({
              id: `exa-${Date.now()}-${exaResults.length}`,
              title: entry.name,
              description,
              location: coordinates,
              source: "exa" as const,
              timestamp: Date.now(),
            });

            yield* Effect.log(
              `✓ ${entry.name} at (${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)})`,
            );
          } else {
            yield* Effect.logWarning(
              `✗ Skipped "${entry.name}" - geocoding failed`,
            );
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
          const searchState = yield* SearchStateServiceTag;
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
}

export const ExaSearchServiceLive = Layer.succeed(
  ExaSearchServiceTag,
  new ExaSearchServiceImpl(),
);
