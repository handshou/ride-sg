import { Effect, Layer } from "effect";
import { ConvexServiceLive } from "./services/convex-service";
import {
  DatabaseSearchServiceLive,
  DatabaseSearchServiceTag,
} from "./services/database-search-service";
import {
  ExaSearchServiceLive,
  ExaSearchServiceTag,
} from "./services/exa-search-service";
import {
  type SearchResult,
  SearchStateServiceLive,
  SearchStateServiceTag,
} from "./services/search-state-service";

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
 * Perform a coordinated search with Convex-first fallback strategy
 *
 * This effect implements the following search flow:
 * 1. Search Convex database first
 * 2. If Convex returns results → return them
 * 3. If Convex returns nothing → search Exa API
 * 4. If Exa returns results → save them to Convex for future searches
 * 5. Return all results found
 *
 * This strategy ensures:
 * - Fast responses from local database (Convex)
 * - Automatic database population from external API (Exa)
 * - Reduced API calls (only when no local data exists)
 */
export const coordinatedSearchEffect = (query: string) =>
  Effect.gen(function* () {
    const searchState = yield* SearchStateServiceTag;
    const exaService = yield* ExaSearchServiceTag;
    const dbService = yield* DatabaseSearchServiceTag;

    // Start search (sets loading state)
    yield* searchState.startSearch(query);
    yield* Effect.log(`Starting coordinated search for: "${query}"`);

    // Step 1: Search Convex database first
    const convexResults = yield* dbService.search(query).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.logError("Convex search failed, will try Exa", error);
          return [];
        }),
      ),
    );

    // Check if Convex returned any results
    if (convexResults.length > 0) {
      yield* Effect.log(
        `Found ${convexResults.length} results in Convex, skipping Exa search`,
      );
      yield* searchState.completeSearch();
      return convexResults;
    }

    // Step 2: No results from Convex, search Exa API
    yield* Effect.log("No results in Convex, searching Exa API...");

    const exaResults = yield* exaService.search(query).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* searchState.setError(
            `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
          yield* Effect.logError("Exa search failed", error);
          return [];
        }),
      ),
    );

    // Step 3: If Exa returned results, save them to Convex
    if (exaResults.length > 0) {
      yield* Effect.log(
        `Found ${exaResults.length} results from Exa, saving to Convex...`,
      );

      // Save all Exa results to Convex in parallel
      yield* Effect.all(
        exaResults.map((result) => dbService.saveLocation(result)),
        { concurrency: 3 }, // Limit concurrent saves
      ).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Effect.logError(
              "Failed to save some Exa results to Convex",
              error,
            );
            // Don't fail the search if save fails
            return [];
          }),
        ),
      );

      yield* Effect.log(
        `Successfully saved ${exaResults.length} Exa results to Convex`,
      );
    } else {
      yield* Effect.log("No results found from Exa");
    }

    // Complete search
    yield* searchState.completeSearch();

    yield* Effect.log(
      `Coordinated search completed: ${exaResults.length} total results`,
    );

    return exaResults;
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
