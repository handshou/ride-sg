"use client";

import { Effect } from "effect";
import { useCallback, useState } from "react";
import { searchLandmarksAction } from "@/lib/actions/search-actions";
import { logger } from "@/lib/client-logger";
import { runSelectResult } from "@/lib/search-orchestrator";
import type {
  SearchResult,
  SearchState,
} from "@/lib/services/search-state-service";
import type { City } from "@/providers/city-provider";

/**
 * React Hook to interact with server-side search
 *
 * This hook uses Next.js Server Actions to keep API keys secure on the server.
 * The search runs server-side and returns results to the client.
 */
export function useSearchState() {
  const [searchState, setSearchState] = useState<SearchState>({
    query: "",
    results: [],
    isLoading: false,
    error: null,
    selectedResult: null,
  });

  /**
   * Perform a coordinated search using server action
   * This keeps API keys (EXA, Mapbox) secure on the server
   * @param query - Search query string
   * @param userLocation - Optional user location for Exa query context
   * @param referenceLocation - Optional reference location for distance calculation
   * @param locationName - Optional human-readable location name from reverse geocoding
   * @param city - City context (singapore or jakarta) for search filtering
   */
  const search = async (
    query: string,
    userLocation?: { latitude: number; longitude: number },
    referenceLocation?: { latitude: number; longitude: number },
    locationName?: string,
    city?: City,
  ) => {
    try {
      // Set loading state
      setSearchState((prev) => ({
        ...prev,
        query,
        isLoading: true,
        error: null,
      }));

      // Call server action (keeps API keys server-side)
      const { results, error } = await searchLandmarksAction(
        query,
        userLocation,
        referenceLocation,
        locationName,
        city,
      );

      if (error) {
        throw new Error(error);
      }

      // Update local React state with results
      setSearchState((prev) => ({
        ...prev,
        query,
        results,
        isLoading: false,
        error: null,
      }));

      return results;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Search failed";

      setSearchState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      throw error;
    }
  };

  /**
   * Select a search result (triggers map update)
   */
  const selectResult = async (result: SearchResult | null) => {
    try {
      await Effect.runPromise(runSelectResult(result));

      setSearchState((prev) => ({
        ...prev,
        selectedResult: result,
      }));
    } catch (error) {
      logger.error("Failed to select result", error);
    }
  };

  /**
   * Refresh search results from current state
   * (In the new server action architecture, just returns current state)
   */
  const refreshResults = async () => {
    return searchState.results;
  };

  /**
   * Manually add a result to the search state
   * (Useful for showing saved locations or navigation results)
   */
  const addResult = useCallback((result: SearchResult) => {
    setSearchState((prev) => ({
      ...prev,
      results: [result],
      selectedResult: result,
      query: result.title, // Set query to location name
    }));
  }, []);

  return {
    // State
    searchState,

    // Actions
    search,
    selectResult,
    refreshResults,
    addResult,

    // Derived state for convenience
    results: searchState.results,
    isLoading: searchState.isLoading,
    error: searchState.error,
    selectedResult: searchState.selectedResult,
  };
}

/**
 * Example usage in a component:
 *
 * ```tsx
 * function SearchComponent() {
 *   const { search, results, isLoading, error, selectResult } = useSearchState();
 *
 *   const handleSearch = async () => {
 *     await search("Marina Bay");
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleSearch} disabled={isLoading}>
 *         Search
 *       </button>
 *       {error && <div>Error: {error}</div>}
 *       {results.map(result => (
 *         <div key={result.id} onClick={() => selectResult(result)}>
 *           {result.title} - {result.source}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
