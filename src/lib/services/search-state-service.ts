import { Context, Effect, Ref } from "effect";

/**
 * Search Result Types
 */
export interface SearchResult {
  id: string;
  title: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
  };
  source: "mapbox" | "exa" | "database";
  timestamp: number;
  address?: string;
  url?: string;
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  selectedResult: SearchResult | null;
}

/**
 * Search State Service Interface
 *
 * Manages shared state between Exa service, Database service, and Map rendering.
 * Uses Effect Ref for reactive state management across services.
 */
export interface SearchStateService {
  // Ref accessors
  readonly state: Ref.Ref<SearchState>;

  // High-level operations
  startSearch: (query: string) => Effect.Effect<void, never>;
  setResults: (results: SearchResult[]) => Effect.Effect<void, never>;
  setError: (error: string) => Effect.Effect<void, never>;
  completeSearch: () => Effect.Effect<void, never>;
  selectResult: (result: SearchResult | null) => Effect.Effect<void, never>;

  // Getters for convenience
  getState: () => Effect.Effect<SearchState, never>;
  getResults: () => Effect.Effect<SearchResult[], never>;
  getSelectedResult: () => Effect.Effect<SearchResult | null, never>;
}

/**
 * SearchStateService as Effect.Service
 * Provides auto-generated accessors and cleaner DI
 */
export class SearchStateService extends Effect.Service<SearchStateService>()(
  "SearchStateService",
  {
    effect: Effect.gen(function* () {
      // Initialize Ref with empty state
      const state = yield* Ref.make<SearchState>({
        query: "",
        results: [],
        isLoading: false,
        error: null,
        selectedResult: null,
      });

      return {
        state,

        startSearch: (query: string) =>
          Ref.update(state, (current) => ({
            ...current,
            query,
            isLoading: true,
            error: null,
            results: [],
          })),

        setResults: (results: SearchResult[]) =>
          Ref.update(state, (current) => ({
            ...current,
            results,
          })),

        setError: (error: string) =>
          Ref.update(state, (current) => ({
            ...current,
            isLoading: false,
            error,
          })),

        completeSearch: () =>
          Ref.update(state, (current) => ({
            ...current,
            isLoading: false,
          })),

        selectResult: (result: SearchResult | null) =>
          Ref.update(state, (current) => ({
            ...current,
            selectedResult: result,
          })),

        getState: () => Ref.get(state),

        getResults: () =>
          Effect.gen(function* () {
            const currentState = yield* Ref.get(state);
            return currentState.results;
          }),

        getSelectedResult: () =>
          Effect.gen(function* () {
            const currentState = yield* Ref.get(state);
            return currentState.selectedResult;
          }),
      };
    }),
    dependencies: [],
  },
) {}

/**
 * Helper effects for common operations
 */

// Start a search operation
export const startSearchEffect = (query: string) =>
  Effect.gen(function* () {
    const searchState = yield* SearchStateService;
    yield* searchState.startSearch(query);
  });

// Add results from a source
export const addSearchResultsEffect = (results: SearchResult[]) =>
  Effect.gen(function* () {
    const searchState = yield* SearchStateService;
    const current = yield* searchState.getResults();
    yield* searchState.setResults([...current, ...results]);
  });

// Complete search operation
export const completeSearchEffect = () =>
  Effect.gen(function* () {
    const searchState = yield* SearchStateService;
    yield* searchState.completeSearch();
  });

// Select a search result (triggers map update)
export const selectSearchResultEffect = (result: SearchResult | null) =>
  Effect.gen(function* () {
    const searchState = yield* SearchStateService;
    yield* searchState.selectResult(result);
  });

// Get current search state
export const getSearchStateEffect = () =>
  Effect.gen(function* () {
    const searchState = yield* SearchStateService;
    return yield* searchState.getState();
  });

/**
 * Legacy export for SearchStateServiceTag (for backwards compatibility during migration)
 * This will be removed once all services are migrated
 */
export const SearchStateServiceTag =
  Context.GenericTag<SearchStateService>("SearchStateService");
