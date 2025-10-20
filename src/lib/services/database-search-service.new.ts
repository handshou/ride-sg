import { Context, Effect } from "effect";
import { ConvexService } from "./convex-service";
import type { SearchResult } from "./search-state-service";
import { SearchStateService } from "./search-state-service";

/**
 * Database Error
 */
export class DatabaseError {
  readonly _tag = "DatabaseError";
  constructor(readonly message: string) {}
}

/**
 * Database Search Service Interface
 *
 * Searches local database for saved locations, user favorites, etc.
 * Uses Convex when configured, falls back to mock data otherwise.
 * Coordinates with SearchStateService to update shared state.
 */
export interface DatabaseSearchService {
  search: (query: string) => Effect.Effect<SearchResult[], DatabaseError>;

  saveLocation: (result: SearchResult) => Effect.Effect<void, DatabaseError>;
}

/**
 * Implementation of Database Search Service
 */
class DatabaseSearchServiceImpl implements DatabaseSearchService {
  search(query: string) {
    return Effect.gen(function* () {
      const searchState = yield* SearchStateService;
      const convexService = yield* ConvexService;

      // Check if Convex is configured
      const isConvexConfigured = yield* convexService.isConfigured();

      let dbResults: SearchResult[];

      if (isConvexConfigured) {
        // Use Convex for search
        dbResults = yield* convexService.searchLocations(query);
        yield* Effect.log(
          `Convex search completed: ${dbResults.length} results`,
        );
      } else {
        // Fall back to mock data when Convex not configured
        yield* Effect.logWarning(
          "Convex not configured, using mock database results",
        );

        const mockResults: SearchResult[] = yield* Effect.sync(() => [
          {
            id: `db-${Date.now()}-1`,
            title: "Saved: Orchard Road",
            description: "Shopping district - saved by user (mock data)",
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
            description: "Resort island - frequently visited (mock data)",
            location: {
              latitude: 1.2494,
              longitude: 103.8303,
            },
            source: "database" as const,
            timestamp: Date.now() - 172800000, // 2 days ago
          },
        ]);

        // Filter results based on query (simple mock filter)
        dbResults = mockResults.filter(
          (result) =>
            result.title.toLowerCase().includes(query.toLowerCase()) ||
            result.description.toLowerCase().includes(query.toLowerCase()),
        );
      }

      // Get current results and append database results
      const currentResults = yield* searchState.getResults();
      yield* searchState.setResults([...currentResults, ...dbResults]);

      yield* Effect.log(
        `Database search completed: ${dbResults.length} results`,
      );

      return dbResults;
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          const searchState = yield* SearchStateService;
          const errorMessage =
            error && typeof error === "object" && "message" in error
              ? String((error as { message: unknown }).message)
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
      const convexService = yield* ConvexService;

      // Check if Convex is configured
      const isConvexConfigured = yield* convexService.isConfigured();

      if (isConvexConfigured) {
        // Save to Convex
        yield* convexService.saveLocation(result);
        yield* Effect.log(`Saved location to Convex: ${result.title}`);
      } else {
        // Fall back to mock localStorage save
        yield* Effect.logWarning(
          "Convex not configured, skipping database save",
        );
        yield* Effect.log(
          `Mock save location: ${result.title} (Convex not configured)`,
        );
      }
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          const errorMessage =
            error && typeof error === "object" && "message" in error
              ? String((error as { message: unknown }).message)
              : "Failed to save location";

          yield* Effect.logError("Database save error", error);

          return yield* Effect.fail(new DatabaseError(errorMessage));
        }),
      ),
    );
  }
}

/**
 * DatabaseSearchService as Effect.Service
 * Provides auto-generated accessors and cleaner DI
 */
export class DatabaseSearchService extends Effect.Service<DatabaseSearchService>()(
  "DatabaseSearchService",
  {
    effect: Effect.succeed(new DatabaseSearchServiceImpl()),
    dependencies: [SearchStateService.Default, ConvexService.Default],
  },
) {}

/**
 * Helper effects
 */

// Search database
export const searchDatabaseEffect = (query: string) =>
  Effect.gen(function* () {
    const dbService = yield* DatabaseSearchService;
    return yield* dbService.search(query);
  });

// Save location to database
export const saveLocationEffect = (result: SearchResult) =>
  Effect.gen(function* () {
    const dbService = yield* DatabaseSearchService;
    yield* dbService.saveLocation(result);
  });

/**
 * Legacy export for DatabaseSearchServiceTag (for backwards compatibility during migration)
 * This will be removed once all services are migrated
 */
export const DatabaseSearchServiceTag =
  Context.GenericTag<DatabaseSearchService>("DatabaseSearchService");
