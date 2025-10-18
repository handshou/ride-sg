import { Context, Effect, Layer } from "effect";
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
 * Integrates with Exa.ai API for semantic search of locations and places.
 * Coordinates with SearchStateService to update shared state.
 */
export interface ExaSearchService {
  search: (
    query: string,
  ) => Effect.Effect<SearchResult[], ExaError, SearchStateService>;
}

export const ExaSearchServiceTag =
  Context.GenericTag<ExaSearchService>("ExaSearchService");

/**
 * Exa API Response Types
 */
interface ExaSearchResult {
  id: string;
  title: string;
  url: string;
  text: string;
  publishedDate?: string;
}

interface ExaSearchResponse {
  results: ExaSearchResult[];
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
 * Implementation of Exa Search Service
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

  search(query: string) {
    return Effect.gen(
      function* (this: ExaSearchServiceImpl) {
        const searchState = yield* SearchStateServiceTag;

        // Update state to loading
        yield* searchState.startSearch(query);

        // Get API keys from config
        const exaApiKey = yield* exaApiKeyConfig;
        const mapboxToken = yield* mapboxTokenConfig;

        // Check if API key is configured
        if (!exaApiKey || exaApiKey === "") {
          yield* Effect.logWarning(
            "EXA_API_KEY not configured, using mock data",
          );
          // Return mock data if no API key
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

        // Search Exa for Singapore landmarks
        yield* Effect.log(
          `Searching Exa API for Singapore landmarks: "${query}"`,
        );

        const searchQuery = `${query} Singapore landmark tourist attraction`;

        const response = yield* Effect.tryPromise({
          try: () =>
            fetch("https://api.exa.ai/search", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": exaApiKey,
              },
              body: JSON.stringify({
                query: searchQuery,
                num_results: 5,
                type: "auto",
                contents: {
                  text: { max_characters: 300 },
                },
                livecrawl: "preferred",
              }),
            }),
          catch: (error) => new ExaError(`Exa API fetch failed: ${error}`),
        });

        if (!response.ok) {
          const errorText = yield* Effect.tryPromise({
            try: () => response.text(),
            catch: () => "Unknown error",
          });
          yield* Effect.logError(
            `Exa API error: ${response.status} - ${errorText}`,
          );
          return yield* Effect.fail(
            new ExaError(`Exa API returned ${response.status}`),
          );
        }

        const data: ExaSearchResponse = yield* Effect.tryPromise({
          try: () => response.json(),
          catch: (error) =>
            new ExaError(`Failed to parse Exa response: ${error}`),
        });

        yield* Effect.log(
          `Exa API returned ${data.results.length} results, geocoding locations...`,
        );

        // Process results and geocode each one
        const exaResults: SearchResult[] = [];

        for (const result of data.results.slice(0, 5)) {
          // Extract location from title or description
          const locationName = result.title;

          // Geocode the location
          const coordinates = yield* this.geocodeLocation(
            locationName,
            mapboxToken,
          );

          if (coordinates) {
            // Create search result with geocoded coordinates
            exaResults.push({
              id: result.id,
              title: result.title,
              description:
                result.text?.substring(0, 200) ||
                `Singapore landmark found via Exa search`,
              location: coordinates,
              source: "exa" as const,
              timestamp: Date.now(),
            });
          } else {
            yield* Effect.logWarning(
              `Skipping result "${result.title}" - geocoding failed`,
            );
          }
        }

        // Update state with results
        yield* searchState.setResults(exaResults);
        yield* searchState.completeSearch();

        yield* Effect.log(
          `Exa search completed: ${exaResults.length} results with coordinates`,
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
              : "Exa search failed";
          yield* searchState.setError(errorMessage);
          yield* Effect.logError("Exa search error", error);
          return yield* Effect.fail(new ExaError("Failed to search Exa API"));
        }),
      ),
    );
  }
}

export const ExaSearchServiceLive = Layer.succeed(
  ExaSearchServiceTag,
  new ExaSearchServiceImpl(),
);

/**
 * Helper effect to perform Exa search
 */
export const searchExaEffect = (query: string) =>
  Effect.gen(function* () {
    const exaService = yield* ExaSearchServiceTag;
    return yield* exaService.search(query);
  });
