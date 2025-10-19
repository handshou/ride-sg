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
// Note: Logger configuration removed to allow all logs in production for debugging
export const SearchLayer = Layer.mergeAll(
  SearchStateServiceLive,
  ConvexServiceLive,
  ExaSearchServiceLive,
  DatabaseSearchServiceLive,
);

/**
 * Calculate similarity score between two strings (0-1)
 * Used for deduplicating search results from different sources
 */
function calculateTitleSimilarity(str1: string, str2: string): number {
  const normalize = (s: string) => s.toLowerCase().trim();
  const a = normalize(str1);
  const b = normalize(str2);

  // Exact match
  if (a === b) return 1.0;

  // One contains the other
  if (a.includes(b) || b.includes(a)) return 0.8;

  // Word overlap
  const words1 = a.split(/\s+/);
  const words2 = b.split(/\s+/);
  const common = words1.filter((w) => words2.includes(w)).length;
  const total = Math.max(words1.length, words2.length);

  return total > 0 ? common / total : 0;
}

/**
 * Calculate distance between two coordinates in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Deduplicate search results by title similarity and coordinate proximity
 * Prioritizes Convex results (cached) over Exa results (fresh API data)
 */
function deduplicateResults(
  convexResults: SearchResult[],
  exaResults: SearchResult[],
): SearchResult[] {
  const merged: SearchResult[] = [...convexResults];
  const SIMILARITY_THRESHOLD = 0.7; // 70% title similarity
  const DISTANCE_THRESHOLD = 100; // 100 meters

  for (const exaResult of exaResults) {
    // Check if this Exa result is similar to any existing Convex result
    const isDuplicate = merged.some((existing) => {
      const titleSimilarity = calculateTitleSimilarity(
        existing.title,
        exaResult.title,
      );
      const distance = calculateDistance(
        existing.location.latitude,
        existing.location.longitude,
        exaResult.location.latitude,
        exaResult.location.longitude,
      );

      return (
        titleSimilarity >= SIMILARITY_THRESHOLD ||
        distance <= DISTANCE_THRESHOLD
      );
    });

    // Only add if not a duplicate
    if (!isDuplicate) {
      merged.push(exaResult);
    }
  }

  return merged;
}

/**
 * Perform a coordinated search with parallel execution strategy
 *
 * This effect implements the following search flow:
 * 1. Search Convex database AND Exa API in parallel
 * 2. Merge results from both sources
 * 3. Deduplicate based on title similarity and coordinate proximity
 * 4. Return merged results (NO automatic saving to Convex)
 *
 * This strategy ensures:
 * - Comprehensive results from both cached and fresh data
 * - Fast parallel execution (no sequential waiting)
 * - No duplicate locations
 * - Manual control over which results to save
 */
export const coordinatedSearchEffect = (query: string) =>
  Effect.gen(function* () {
    const searchState = yield* SearchStateServiceTag;
    const exaService = yield* ExaSearchServiceTag;
    const dbService = yield* DatabaseSearchServiceTag;

    // Start search (sets loading state)
    yield* searchState.startSearch(query);
    yield* Effect.log(`Starting parallel search for: "${query}"`);

    // Search both Convex and Exa in parallel
    const [convexResults, exaResults] = yield* Effect.all(
      [
        dbService.search(query).pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Effect.logError("Convex search failed", error);
              return [];
            }),
          ),
        ),
        exaService.search(query).pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Effect.logError("Exa search failed", error);
              return [];
            }),
          ),
        ),
      ],
      { concurrency: "unbounded" },
    );

    yield* Effect.log(
      `Parallel search results: ${convexResults.length} from Convex, ${exaResults.length} from Exa`,
    );

    // Deduplicate and merge results
    const mergedResults = deduplicateResults(convexResults, exaResults);

    yield* Effect.log(
      `Merged and deduplicated: ${mergedResults.length} unique results`,
    );

    // Complete search
    yield* searchState.completeSearch();

    return mergedResults;
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
