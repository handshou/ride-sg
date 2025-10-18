import { Context, Effect, Layer } from "effect";
import { convexDeploymentConfig } from "./config-service";
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
  isConfigured(): Effect.Effect<boolean> {
    return Effect.gen(function* () {
      const deployment = yield* convexDeploymentConfig;
      return deployment !== "" && deployment !== undefined;
    }).pipe(Effect.catchAll(() => Effect.succeed(false)));
  }

  searchLocations(query: string): Effect.Effect<SearchResult[], ConvexError> {
    return Effect.gen(function* () {
      const deployment = yield* convexDeploymentConfig;

      if (!deployment || deployment === "") {
        yield* Effect.logWarning(
          "CONVEX_DEPLOYMENT not configured, using empty results",
        );
        return [];
      }

      // TODO: Implement actual Convex query using MCP tools
      // For now, return empty array indicating Convex is ready but no data
      yield* Effect.log(
        `Convex search for "${query}" (deployment configured, awaiting implementation)`,
      );

      return [];
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.logError("Convex search error", error);
          return yield* Effect.fail(
            new ConvexError("Failed to search Convex database", error),
          );
        }),
      ),
    );
  }

  saveLocation(result: SearchResult): Effect.Effect<void, ConvexError> {
    return Effect.gen(function* () {
      const deployment = yield* convexDeploymentConfig;

      if (!deployment || deployment === "") {
        yield* Effect.logWarning(
          "CONVEX_DEPLOYMENT not configured, skipping save",
        );
        return;
      }

      // TODO: Implement actual Convex mutation using MCP tools
      yield* Effect.log(
        `Convex save location: ${result.title} (awaiting implementation)`,
      );
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.logError("Convex save error", error);
          return yield* Effect.fail(
            new ConvexError("Failed to save to Convex database", error),
          );
        }),
      ),
    );
  }

  getAllLocations(): Effect.Effect<SearchResult[], ConvexError> {
    return Effect.gen(function* () {
      const deployment = yield* convexDeploymentConfig;

      if (!deployment || deployment === "") {
        yield* Effect.logWarning(
          "CONVEX_DEPLOYMENT not configured, returning empty list",
        );
        return [];
      }

      // TODO: Implement actual Convex query using MCP tools
      yield* Effect.log("Convex get all locations (awaiting implementation)");

      return [];
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.logError("Convex get all error", error);
          return yield* Effect.fail(
            new ConvexError("Failed to get locations from Convex", error),
          );
        }),
      ),
    );
  }

  deleteLocation(id: string): Effect.Effect<void, ConvexError> {
    return Effect.gen(function* () {
      const deployment = yield* convexDeploymentConfig;

      if (!deployment || deployment === "") {
        yield* Effect.logWarning(
          "CONVEX_DEPLOYMENT not configured, skipping delete",
        );
        return;
      }

      // TODO: Implement actual Convex mutation using MCP tools
      yield* Effect.log(
        `Convex delete location: ${id} (awaiting implementation)`,
      );
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.logError("Convex delete error", error);
          return yield* Effect.fail(
            new ConvexError("Failed to delete from Convex", error),
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
