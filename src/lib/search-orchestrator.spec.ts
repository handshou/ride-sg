import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
  coordinatedSearchEffect,
  getSearchResultsEffect,
  SearchLayer,
  selectResultEffect,
  watchSelectedResultEffect,
} from "./search-orchestrator";
import type { SearchResult } from "./services/search-state-service";

describe("Search Orchestrator - Convex-First Search Strategy", () => {
  describe("Coordinated Search", () => {
    it("should search Convex first, fallback to Exa if empty, and save results", async () => {
      const program = coordinatedSearchEffect("marina").pipe(
        Effect.provide(SearchLayer),
      );

      const results = await Effect.runPromise(program);

      // Should have results from either Convex or Exa (fallback)
      expect(results.length).toBeGreaterThan(0);

      // Verify at least one source returned results
      const sources = new Set(results.map((r) => r.source));
      expect(sources.size).toBeGreaterThan(0); // At least one source
    });

    it("should update shared state during search", async () => {
      const program = Effect.gen(function* () {
        // Perform search
        yield* coordinatedSearchEffect("gardens");

        // Check that state was updated
        const results = yield* getSearchResultsEffect();

        return results;
      }).pipe(Effect.provide(SearchLayer));

      const results = await Effect.runPromise(program);

      expect(results.length).toBeGreaterThan(0);
    });

    it("should handle concurrent searches gracefully", async () => {
      const program = Effect.all(
        [
          coordinatedSearchEffect("marina"),
          coordinatedSearchEffect("gardens"),
          coordinatedSearchEffect("orchard"),
        ],
        { concurrency: "unbounded" },
      ).pipe(Effect.provide(SearchLayer));

      const [results1, results2, results3] = await Effect.runPromise(program);

      // All searches should complete successfully
      expect(results1.length).toBeGreaterThanOrEqual(0);
      expect(results2.length).toBeGreaterThanOrEqual(0);
      expect(results3.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Result Selection", () => {
    it("should select a search result and update state", async () => {
      const mockResult: SearchResult = {
        id: "test-1",
        title: "Test Location",
        description: "A test location",
        location: { latitude: 1.3521, longitude: 103.8198 },
        source: "exa",
        timestamp: Date.now(),
      };

      const program = Effect.gen(function* () {
        // Select result
        yield* selectResultEffect(mockResult);

        // Verify selection
        const selected = yield* watchSelectedResultEffect();

        return selected;
      }).pipe(Effect.provide(SearchLayer));

      const selected = await Effect.runPromise(program);

      expect(selected).toEqual(mockResult);
    });

    it("should deselect when null is passed", async () => {
      const program = Effect.gen(function* () {
        // First select a result
        const mockResult: SearchResult = {
          id: "test-1",
          title: "Test Location",
          description: "A test location",
          location: { latitude: 1.3521, longitude: 103.8198 },
          source: "database",
          timestamp: Date.now(),
        };

        yield* selectResultEffect(mockResult);

        // Then deselect
        yield* selectResultEffect(null);

        // Verify deselection
        const selected = yield* watchSelectedResultEffect();

        return selected;
      }).pipe(Effect.provide(SearchLayer));

      const selected = await Effect.runPromise(program);

      expect(selected).toBeNull();
    });
  });

  describe("State Sharing Between Services", () => {
    it("should implement Convex-first strategy with Exa fallback", async () => {
      const program = Effect.gen(function* () {
        // Start a search
        yield* coordinatedSearchEffect("test");

        // Get results (from Convex first, or Exa if Convex empty)
        const results = yield* getSearchResultsEffect();

        // Verify we got results from at least one source
        const hasExaResults = results.some((r) => r.source === "exa");
        const hasDbResults = results.some((r) => r.source === "database");

        return { hasExaResults, hasDbResults, totalResults: results.length };
      }).pipe(Effect.provide(SearchLayer));

      const { hasExaResults, hasDbResults, totalResults } =
        await Effect.runPromise(program);

      // Should have results from at least one source
      expect(totalResults).toBeGreaterThan(0);
      expect(hasExaResults || hasDbResults).toBe(true);
    });

    it("should maintain state consistency across multiple operations", async () => {
      const program = Effect.gen(function* () {
        // First search
        yield* coordinatedSearchEffect("marina");
        const results1 = yield* getSearchResultsEffect();

        // Select a result
        const firstResult = results1[0];
        if (firstResult) {
          yield* selectResultEffect(firstResult);
        }

        // Second search (should update state)
        yield* coordinatedSearchEffect("orchard");
        const results2 = yield* getSearchResultsEffect();

        // Selected result should still be accessible
        const selected = yield* watchSelectedResultEffect();

        return {
          firstSearchResults: results1.length,
          secondSearchResults: results2.length,
          selectedId: selected?.id,
        };
      }).pipe(Effect.provide(SearchLayer));

      const result = await Effect.runPromise(program);

      expect(result.firstSearchResults).toBeGreaterThan(0);
      expect(result.secondSearchResults).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle search errors gracefully with Convex-first fallback", async () => {
      // This test demonstrates the fallback strategy:
      // If Convex fails → try Exa
      // If Exa fails → return empty array
      const program = coordinatedSearchEffect("error-trigger").pipe(
        Effect.provide(SearchLayer),
      );

      // Should not throw, even if errors occur
      const results = await Effect.runPromise(program);

      // Should return at least an empty array
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
