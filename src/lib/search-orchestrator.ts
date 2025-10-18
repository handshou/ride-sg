import { Effect, Layer } from "effect";
import { ConvexServiceLive } from "./convex-service";
import {
  DatabaseSearchServiceLive,
  DatabaseSearchServiceTag,
} from "./database-search-service";
import {
  ExaSearchServiceLive,
  ExaSearchServiceTag,
} from "./exa-search-service";
import {
  type SearchResult,
  SearchStateServiceLive,
  SearchStateServiceTag,
} from "./search-state-service";

/**
 * Search Orchestrator
 *
 * Coordinates searches across multiple data sources (Exa API, Database)
 * and manages the shared search state using Effect Atom.
 *
 * This demonstrates the power of Effect Atom for coordinating multiple
 * services that need to share state reactively.
 */

// Combined layer with all search-related services
export const SearchLayer = Layer.mergeAll(
  SearchStateServiceLive,
  ConvexServiceLive,
  ExaSearchServiceLive,
  DatabaseSearchServiceLive,
);

/**
 * Perform a coordinated search across all data sources
 *
 * This effect:
 * 1. Starts the search (updates state to loading)
 * 2. Searches Exa API (results added to state)
 * 3. Searches Database (results appended to state)
 * 4. Completes the search (updates state to not loading)
 *
 * All services share the same SearchState via Effect Atom,
 * so results accumulate as each source completes.
 */
export const coordinatedSearchEffect = (query: string) =>
  Effect.gen(function* () {
    const searchState = yield* SearchStateServiceTag;
    const exaService = yield* ExaSearchServiceTag;
    const dbService = yield* DatabaseSearchServiceTag;

    // Start search (sets loading state)
    yield* searchState.startSearch(query);
    yield* Effect.log(`Starting coordinated search for: "${query}"`);

    // Search both sources in parallel
    // Results are automatically accumulated in SearchState via Atom
    const results = yield* Effect.all(
      [exaService.search(query), dbService.search(query)],
      { concurrency: "unbounded" },
    ).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* searchState.setError(
            `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
          yield* Effect.logError("Coordinated search failed", error);
          return [[], []] as [SearchResult[], SearchResult[]];
        }),
      ),
    );

    const [exaResults, dbResults] = results;

    // Complete search
    yield* searchState.completeSearch();

    const totalResults = exaResults.length + dbResults.length;
    yield* Effect.log(
      `Coordinated search completed: ${totalResults} total results (${exaResults.length} from Exa, ${dbResults.length} from DB)`,
    );

    // Return combined results
    return [...exaResults, ...dbResults];
  });

/**
 * Get current search results from shared state
 */
export const getSearchResultsEffect = () =>
  Effect.gen(function* () {
    const searchState = yield* SearchStateServiceTag;
    return yield* searchState.getResults();
  });

/**
 * Select a result (triggers map update in UI)
 */
export const selectResultEffect = (result: SearchResult | null) =>
  Effect.gen(function* () {
    const searchState = yield* SearchStateServiceTag;
    yield* searchState.selectResult(result);

    if (result) {
      yield* Effect.log(
        `Selected result: ${result.title} at (${result.location.latitude}, ${result.location.longitude})`,
      );
    }
  });

/**
 * Watch for selected result changes (for map rendering)
 *
 * This is where the magic happens - when a result is selected,
 * the map service can subscribe to this effect and automatically
 * update the map view.
 */
export const watchSelectedResultEffect = () =>
  Effect.gen(function* () {
    const searchState = yield* SearchStateServiceTag;
    return yield* searchState.getSelectedResult();
  });

/**
 * Helper to run a search with all dependencies provided
 */
export const runCoordinatedSearch = (query: string) =>
  coordinatedSearchEffect(query).pipe(Effect.provide(SearchLayer));

/**
 * Helper to get results with all dependencies provided
 */
export const runGetSearchResults = () =>
  getSearchResultsEffect().pipe(Effect.provide(SearchLayer));

/**
 * Helper to select a result with all dependencies provided
 */
export const runSelectResult = (result: SearchResult | null) =>
  selectResultEffect(result).pipe(Effect.provide(SearchLayer));
