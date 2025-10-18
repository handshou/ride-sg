import { Context, Effect, Layer } from "effect";
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
 * Implementation of Exa Search Service
 */
export class ExaSearchServiceImpl implements ExaSearchService {
  search(query: string) {
    return Effect.gen(function* () {
      const searchState = yield* SearchStateServiceTag;

      // Update state to loading
      yield* searchState.startSearch(query);

      // TODO: Replace with actual Exa API call
      // For now, return mock data
      const exaResults: SearchResult[] = yield* Effect.sync(() => [
        {
          id: `exa-${Date.now()}-1`,
          title: "Marina Bay Sands",
          description: "Iconic integrated resort with rooftop infinity pool",
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
          description: "Nature park with futuristic Supertree structures",
          location: {
            latitude: 1.2816,
            longitude: 103.8636,
          },
          source: "exa" as const,
          timestamp: Date.now(),
        },
      ]);

      // Update state with results
      yield* searchState.setResults(exaResults);
      yield* searchState.completeSearch();

      yield* Effect.log(`Exa search completed: ${exaResults.length} results`);

      return exaResults;
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          const searchState = yield* SearchStateServiceTag;
          const errorMessage =
            error && typeof error === "object" && "message" in error
              ? (error as Error).message
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
