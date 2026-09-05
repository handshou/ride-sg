import { Context, Effect } from "effect";
import {
  type LocationCity,
  LocationRepository,
  LocationRepositoryError,
} from "../repositories/location-repository";
import type { SearchResult } from "./search-state-service";
import { SearchStateService } from "./search-state-service";

/** Failure raised by the application-facing database search service. */
export class DatabaseError {
  readonly _tag = "DatabaseError";
  constructor(readonly message: string) {}
}

/** Application-facing database operations used by search orchestration. */
export interface IDatabaseSearchService {
  search: (
    query: string,
    city?: LocationCity,
  ) => Effect.Effect<
    SearchResult[],
    DatabaseError,
    SearchStateService | LocationRepository
  >;
  saveLocation: (
    result: SearchResult,
    city?: LocationCity,
  ) => Effect.Effect<void, DatabaseError, LocationRepository>;
}

class DatabaseSearchServiceImpl {
  search(query: string, city?: LocationCity) {
    return Effect.gen(function* () {
      const searchState = yield* SearchStateService;
      const repository = yield* LocationRepository;
      const locations = yield* repository.searchLocations(query, city);
      const databaseResults: SearchResult[] = locations.map((location) => ({
        id: location.id,
        title: location.title,
        description: location.description,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        source: "database",
        timestamp: location.timestamp,
        address: location.postalCode
          ? `${location.city === "singapore" ? "Singapore" : "Jakarta"} ${location.postalCode}`
          : "",
        url: "",
        distance: 0,
      }));

      const currentResults = yield* searchState.getResults();
      yield* searchState.setResults([...currentResults, ...databaseResults]);
      yield* Effect.log(
        `Database search completed: ${databaseResults.length} results`,
      );

      return databaseResults;
    }).pipe(
      Effect.mapError((error) => {
        const message =
          error instanceof LocationRepositoryError
            ? `${error.operation} failed`
            : "Database search failed";
        return new DatabaseError(message);
      }),
    );
  }

  saveLocation(result: SearchResult, city: LocationCity = "singapore") {
    return Effect.gen(function* () {
      const repository = yield* LocationRepository;
      yield* repository.saveLocation({
        title: result.title,
        description: result.description,
        latitude: result.location.latitude,
        longitude: result.location.longitude,
        source: result.source,
        timestamp: result.timestamp,
        city,
        isRandomizable: false,
        postalCode: result.address?.match(/\b\d{6}\b/)?.[0],
      });
      yield* Effect.log(`Saved location to database: ${result.title}`);
    }).pipe(
      Effect.mapError(
        (error) =>
          new DatabaseError(
            error instanceof LocationRepositoryError
              ? `${error.operation} failed`
              : "Failed to save location",
          ),
      ),
    );
  }
}

/** Effect service that coordinates search state with LocationRepository. */
export class DatabaseSearchService extends Effect.Service<DatabaseSearchService>()(
  "DatabaseSearchService",
  {
    effect: Effect.succeed(new DatabaseSearchServiceImpl()),
    dependencies: [SearchStateService.Default],
  },
) {}

/** Searches the configured database repository. */
export const searchDatabaseEffect = (query: string, city?: LocationCity) =>
  Effect.gen(function* () {
    const databaseService = yield* DatabaseSearchService;
    return yield* databaseService.search(query, city);
  });

/** Saves a location through the configured database repository. */
export const saveLocationEffect = (result: SearchResult, city?: LocationCity) =>
  Effect.gen(function* () {
    const databaseService = yield* DatabaseSearchService;
    yield* databaseService.saveLocation(result, city);
  });

/** Legacy service tag retained while old call sites migrate. */
export const DatabaseSearchServiceTag =
  Context.GenericTag<IDatabaseSearchService>("DatabaseSearchService");
