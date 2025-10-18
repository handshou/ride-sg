"use client";

import { Effect } from "effect";
import { useState } from "react";
import { logger } from "@/lib/client-logger";
import {
  runCoordinatedSearch,
  runGetSearchResults,
  runSelectResult,
} from "@/lib/search-orchestrator";
import type {
  SearchResult,
  SearchState,
} from "@/lib/services/search-state-service";

/**
 * React Hook to interact with Effect Atom-based search state
 *
 * This hook bridges Effect-TS Atom state with React components,
 * allowing you to use the coordinated search functionality in your UI.
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
   * Perform a coordinated search across Exa and Database
   */
  const search = async (query: string) => {
    try {
      // Run the coordinated search effect
      const results = await Effect.runPromise(runCoordinatedSearch(query));

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
   * Get current search results
   */
  const refreshResults = async () => {
    try {
      const results = await Effect.runPromise(runGetSearchResults());

      setSearchState((prev) => ({
        ...prev,
        results,
      }));

      return results;
    } catch (error) {
      logger.error("Failed to refresh results", error);
      return [];
    }
  };

  return {
    // State
    searchState,

    // Actions
    search,
    selectResult,
    refreshResults,

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
