import { ConvexHttpClient } from "convex/browser";
import type { GenericId } from "convex/values";
import { Context, Effect, Layer } from "effect";
import { api } from "../../../convex/_generated/api";
import { convexPublicDeploymentConfig } from "./config-service";
import type { SearchResult } from "./search-state-service";

/**
 * Convex Error
 */
export class ConvexError {
  readonly _tag = "ConvexError";
  constructor(
    readonly message: string,
    readonly cause?: unknown,
  ) {}
}

/**
 * Convex Service Interface
 *
 * Provides database operations using Convex backend
 */
export interface ConvexService {
  /**
   * Check if Convex is configured
   */
  isConfigured(): Effect.Effect<boolean>;

  /**
   * Search saved locations
   */
  searchLocations(query: string): Effect.Effect<SearchResult[], ConvexError>;

  /**
   * Save a location
   */
  saveLocation(result: SearchResult): Effect.Effect<void, ConvexError>;

  /**
   * Get all saved locations
   */
  getAllLocations(): Effect.Effect<SearchResult[], ConvexError>;

  /**
   * Delete a location by ID
   */
  deleteLocation(id: string): Effect.Effect<void, ConvexError>;
}

/**
 * Convex service tag for dependency injection
 */
export const ConvexServiceTag =
  Context.GenericTag<ConvexService>("ConvexService");

/**
 * Live implementation of ConvexService
 */
export class ConvexServiceImpl implements ConvexService {
  private client: ConvexHttpClient | null = null;

  /**
   * Get or create the Convex client
   */
  private getClient() {
    return Effect.gen(
      function* (this: ConvexServiceImpl) {
        if (this.client) {
          return this.client;
        }

        const deployment = yield* convexPublicDeploymentConfig;

        if (!deployment || deployment === "") {
          yield* Effect.logWarning(
            "NEXT_PUBLIC_CONVEX_URL not configured, Convex client unavailable",
          );
          return null;
        }

        // Create and cache the client
        this.client = new ConvexHttpClient(deployment);
        yield* Effect.log(
          `Convex client initialized with deployment: ${deployment}`,
        );
        return this.client;
      }.bind(this),
    );
  }

  isConfigured(): Effect.Effect<boolean> {
    return Effect.gen(function* () {
      const deployment = yield* convexPublicDeploymentConfig;
      return deployment !== "" && deployment !== undefined;
    }).pipe(Effect.catchAll(() => Effect.succeed(false)));
  }

  searchLocations(query: string): Effect.Effect<SearchResult[], ConvexError> {
    return Effect.gen(
      function* (this: ConvexServiceImpl) {
        const client = yield* this.getClient();

        if (!client) {
          yield* Effect.logWarning(
            "Convex client not available, returning empty results",
          );
          return [];
        }

        yield* Effect.log(`Searching Convex for: "${query}"`);

        // Call the Convex query
        const locations = yield* Effect.tryPromise({
          try: () => client.query(api.locations.searchLocations, { query }),
          catch: (error) =>
            new ConvexError("Failed to search Convex database", error),
        });

        // Convert Convex locations to SearchResults
        // Mark all results as "database" source to indicate they came from Convex cache
        const results: SearchResult[] = locations.map(
          (loc: {
            _id: string;
            _creationTime: number;
            title: string;
            description: string;
            latitude: number;
            longitude: number;
            source: "mapbox" | "exa" | "database";
            timestamp: number;
          }) => ({
            id: loc._id,
            title: loc.title,
            description: loc.description,
            location: {
              latitude: loc.latitude,
              longitude: loc.longitude,
            },
            source: "database" as const, // Override to show they came from Convex
            timestamp: loc.timestamp,
          }),
        );

        yield* Effect.log(
          `Convex search completed: ${results.length} results found`,
        );

        return results;
      }.bind(this),
    ).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.logError("Convex search error", error);
          return yield* Effect.fail(
            error instanceof ConvexError
              ? error
              : new ConvexError("Failed to search Convex database", error),
          );
        }),
      ),
    );
  }

  saveLocation(result: SearchResult): Effect.Effect<void, ConvexError> {
    return Effect.gen(
      function* (this: ConvexServiceImpl) {
        const client = yield* this.getClient();

        if (!client) {
          yield* Effect.logWarning(
            "Convex client not available, skipping save",
          );
          return;
        }

        yield* Effect.log(`Saving location to Convex: ${result.title}`);

        // Call the Convex mutation
        yield* Effect.tryPromise({
          try: () =>
            client.mutation(api.locations.saveLocation, {
              title: result.title,
              description: result.description,
              latitude: result.location.latitude,
              longitude: result.location.longitude,
              source: result.source,
              timestamp: result.timestamp,
            }),
          catch: (error) =>
            new ConvexError("Failed to save to Convex database", error),
        });

        yield* Effect.log(
          `Successfully saved location to Convex: ${result.title}`,
        );
      }.bind(this),
    ).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.logError("Convex save error", error);
          return yield* Effect.fail(
            error instanceof ConvexError
              ? error
              : new ConvexError("Failed to save to Convex database", error),
          );
        }),
      ),
    );
  }

  getAllLocations(): Effect.Effect<SearchResult[], ConvexError> {
    return Effect.gen(
      function* (this: ConvexServiceImpl) {
        const client = yield* this.getClient();

        if (!client) {
          yield* Effect.logWarning(
            "Convex client not available, returning empty list",
          );
          return [];
        }

        yield* Effect.log("Getting all locations from Convex");

        // Call the Convex query
        const locations = yield* Effect.tryPromise({
          try: () => client.query(api.locations.getAllLocations, {}),
          catch: (error) =>
            new ConvexError("Failed to get locations from Convex", error),
        });

        // Convert Convex locations to SearchResults
        // Mark all results as "database" source to indicate they came from Convex
        const results: SearchResult[] = locations.map(
          (loc: {
            _id: string;
            _creationTime: number;
            title: string;
            description: string;
            latitude: number;
            longitude: number;
            source: "mapbox" | "exa" | "database";
            timestamp: number;
          }) => ({
            id: loc._id,
            title: loc.title,
            description: loc.description,
            location: {
              latitude: loc.latitude,
              longitude: loc.longitude,
            },
            source: "database" as const, // Override to show they came from Convex
            timestamp: loc.timestamp,
          }),
        );

        yield* Effect.log(`Retrieved ${results.length} locations from Convex`);

        return results;
      }.bind(this),
    ).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.logError("Convex get all error", error);
          return yield* Effect.fail(
            error instanceof ConvexError
              ? error
              : new ConvexError("Failed to get locations from Convex", error),
          );
        }),
      ),
    );
  }

  deleteLocation(id: string): Effect.Effect<void, ConvexError> {
    return Effect.gen(
      function* (this: ConvexServiceImpl) {
        const client = yield* this.getClient();

        if (!client) {
          yield* Effect.logWarning(
            "Convex client not available, skipping delete",
          );
          return;
        }

        yield* Effect.log(`Deleting location from Convex: ${id}`);

        // Call the Convex mutation
        // Cast string id to Convex GenericId type
        yield* Effect.tryPromise({
          try: () =>
            client.mutation(api.locations.deleteLocation, {
              id: id as GenericId<"locations">,
            }),
          catch: (error) =>
            new ConvexError("Failed to delete from Convex", error),
        });

        yield* Effect.log(`Successfully deleted location from Convex: ${id}`);
      }.bind(this),
    ).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.logError("Convex delete error", error);
          return yield* Effect.fail(
            error instanceof ConvexError
              ? error
              : new ConvexError("Failed to delete from Convex", error),
          );
        }),
      ),
    );
  }
}

/**
 * Live layer for ConvexService
 */
export const ConvexServiceLive = Layer.succeed(
  ConvexServiceTag,
  new ConvexServiceImpl(),
);

/**
 * Helper effects
 */

// Check if Convex is configured
export const isConvexConfiguredEffect = () =>
  Effect.gen(function* () {
    const convexService = yield* ConvexServiceTag;
    return yield* convexService.isConfigured();
  });

// Search Convex locations
export const searchConvexLocationsEffect = (query: string) =>
  Effect.gen(function* () {
    const convexService = yield* ConvexServiceTag;
    return yield* convexService.searchLocations(query);
  });

// Save location to Convex
export const saveConvexLocationEffect = (result: SearchResult) =>
  Effect.gen(function* () {
    const convexService = yield* ConvexServiceTag;
    yield* convexService.saveLocation(result);
  });

// Get all Convex locations
export const getAllConvexLocationsEffect = () =>
  Effect.gen(function* () {
    const convexService = yield* ConvexServiceTag;
    return yield* convexService.getAllLocations();
  });

// Delete Convex location
export const deleteConvexLocationEffect = (id: string) =>
  Effect.gen(function* () {
    const convexService = yield* ConvexServiceTag;
    yield* convexService.deleteLocation(id);
  });
