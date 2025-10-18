import { Context, Effect, Layer } from "effect";
import type { SearchResult, SearchStateService } from "./search-state-service";
import { SearchStateServiceTag } from "./search-state-service";

/**
 * Database Error
 */
export class DatabaseError {
  readonly _tag = "DatabaseError";
  constructor(readonly message: string) {}
}

/**
 * Database Search Service
 *
 * Searches local database for saved locations, user favorites, etc.
 * Coordinates with SearchStateService to update shared state.
 */
export interface DatabaseSearchService {
  search: (
    query: string,
  ) => Effect.Effect<SearchResult[], DatabaseError, SearchStateService>;

  saveLocation: (result: SearchResult) => Effect.Effect<void, DatabaseError>;
}

export const DatabaseSearchServiceTag =
  Context.GenericTag<DatabaseSearchService>("DatabaseSearchService");

/**
 * Implementation of Database Search Service
 */
export class DatabaseSearchServiceImpl implements DatabaseSearchService {
  search(query: string) {
    return Effect.gen(function* () {
      const searchState = yield* SearchStateServiceTag;

      // TODO: Replace with actual database query
      // For now, return mock saved locations
      const dbResults: SearchResult[] = yield* Effect.sync(() => [
        {
          id: `db-${Date.now()}-1`,
          title: "Saved: Orchard Road",
          description: "Shopping district - saved by user",
          location: {
            latitude: 1.3048,
            longitude: 103.8318,
          },
          source: "database" as const,
          timestamp: Date.now() - 86400000, // 1 day ago
        },
        {
          id: `db-${Date.now()}-2`,
          title: "Saved: Sentosa Island",
          description: "Resort island - frequently visited",
          location: {
            latitude: 1.2494,
            longitude: 103.8303,
          },
          source: "database" as const,
          timestamp: Date.now() - 172800000, // 2 days ago
        },
      ]);

      // Filter results based on query (simple mock filter)
      const filteredResults = dbResults.filter(
        (result) =>
          result.title.toLowerCase().includes(query.toLowerCase()) ||
          result.description.toLowerCase().includes(query.toLowerCase()),
      );

      // Get current results and append database results
      const currentResults = yield* searchState.getResults();
      yield* searchState.setResults([...currentResults, ...filteredResults]);

      yield* Effect.log(
        `Database search completed: ${filteredResults.length} results`,
      );

      return filteredResults;
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          const searchState = yield* SearchStateServiceTag;
          const errorMessage =
            error && typeof error === "object" && "message" in error
              ? (error as Error).message
              : "Database search failed";

          yield* searchState.setError(errorMessage);
          yield* Effect.logError("Database search error", error);

          return yield* Effect.fail(new DatabaseError(errorMessage));
        }),
      ),
    );
  }

  saveLocation(result: SearchResult) {
    return Effect.gen(function* () {
      // TODO: Replace with actual database save
      yield* Effect.sync(() => {
        // Mock save to localStorage
        const saved = JSON.parse(
          localStorage.getItem("savedLocations") || "[]",
        );
        saved.push(result);
        localStorage.setItem("savedLocations", JSON.stringify(saved));
      });

      yield* Effect.log(`Saved location: ${result.title}`);
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          const errorMessage =
            error && typeof error === "object" && "message" in error
              ? (error as Error).message
              : "Failed to save location";

          yield* Effect.logError("Database save error", error);

          return Effect.fail(new DatabaseError(errorMessage));
        }),
      ),
    );
  }
}

export const DatabaseSearchServiceLive = Layer.succeed(
  DatabaseSearchServiceTag,
  new DatabaseSearchServiceImpl(),
);

/**
 * Helper effects
 */

// Search database
export const searchDatabaseEffect = (query: string) =>
  Effect.gen(function* () {
    const dbService = yield* DatabaseSearchServiceTag;
    return yield* dbService.search(query);
  });

// Save location to database
export const saveLocationEffect = (result: SearchResult) =>
  Effect.gen(function* () {
    const dbService = yield* DatabaseSearchServiceTag;
    yield* dbService.saveLocation(result);
  });
