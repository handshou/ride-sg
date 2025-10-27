import { Context, Effect, Layer } from "effect";
import type mapboxgl from "mapbox-gl";
import type { StructuredAddress } from "../utils/geocoding-utils";

/**
 * Building Highlight Service
 *
 * Highlights specific buildings on the map in purple when a search result is selected.
 * Uses Mapbox's 3D building layers and feature-state API for precise building selection.
 */

/**
 * Configuration for building highlighting
 */
export interface BuildingHighlightConfig {
  /** Color for highlighted building (Tailwind purple-600) */
  highlightColor: string;
  /** Default building color */
  defaultColor: string;
  /** Building outline color when highlighted */
  outlineColor: string;
  /** Building outline width */
  outlineWidth: number;
}

/**
 * Result of building query
 */
export interface BuildingQueryResult {
  featureId: string | number;
  sourceLayer: string;
  buildingName?: string;
  address?: string;
}

/**
 * Error types
 */
export class BuildingNotFoundError {
  readonly _tag = "BuildingNotFoundError";
  constructor(
    public readonly message: string,
    public readonly coordinates: { latitude: number; longitude: number },
  ) {}
}

export class MapLayerNotReadyError {
  readonly _tag = "MapLayerNotReadyError";
  constructor(public readonly message: string) {}
}

/**
 * Building Highlight Service Interface
 */
export interface BuildingHighlightService {
  /**
   * Highlight a specific building at the given coordinates
   *
   * @param map - Mapbox map instance
   * @param coordinates - Building coordinates
   * @param address - Optional structured address for better matching
   * @returns Effect with void on success or error
   */
  highlightBuilding(
    map: mapboxgl.Map,
    coordinates: { latitude: number; longitude: number },
    address?: StructuredAddress,
  ): Effect.Effect<void, BuildingNotFoundError | MapLayerNotReadyError, never>;

  /**
   * Clear the currently highlighted building
   *
   * @param map - Mapbox map instance
   * @returns Effect with void
   */
  clearHighlight(map: mapboxgl.Map): Effect.Effect<void, never, never>;

  /**
   * Query building features at specific coordinates
   *
   * @param map - Mapbox map instance
   * @param coordinates - Query coordinates
   * @returns Effect with building query result or error
   */
  queryBuilding(
    map: mapboxgl.Map,
    coordinates: { latitude: number; longitude: number },
  ): Effect.Effect<BuildingQueryResult, BuildingNotFoundError, never>;
}

/**
 * Implementation of Building Highlight Service
 */
export class BuildingHighlightServiceImpl implements BuildingHighlightService {
  private config: BuildingHighlightConfig = {
    highlightColor: "#9333ea", // purple-600
    defaultColor: "#aaa",
    outlineColor: "#9333ea",
    outlineWidth: 2,
  };

  // Track currently highlighted building for cleanup
  private currentHighlight: {
    source: string;
    sourceLayer: string;
    id: string | number;
  } | null = null;

  queryBuilding(
    map: mapboxgl.Map,
    coordinates: { latitude: number; longitude: number },
  ): Effect.Effect<BuildingQueryResult, BuildingNotFoundError, never> {
    return Effect.try({
      try: () => {
        // Convert lat/lng to screen coordinates
        const point = map.project([
          coordinates.longitude,
          coordinates.latitude,
        ]);

        // Query rendered features at this point
        // Try multiple building layer IDs (different Mapbox styles use different IDs)
        const layerIds = [
          "building",
          "building-3d",
          "3d-buildings",
          "building-extrusion",
        ];

        let features: mapboxgl.MapboxGeoJSONFeature[] = [];

        for (const layerId of layerIds) {
          const layerFeatures = map.queryRenderedFeatures(point, {
            layers: [layerId],
          });

          if (layerFeatures && layerFeatures.length > 0) {
            features = layerFeatures;
            break;
          }
        }

        if (!features || features.length === 0) {
          throw new BuildingNotFoundError(
            "No building found at these coordinates",
            coordinates,
          );
        }

        // Get the first feature (closest building)
        const feature = features[0];

        if (!feature.id || !feature.source || !feature.sourceLayer) {
          throw new BuildingNotFoundError(
            "Building feature missing required properties",
            coordinates,
          );
        }

        return {
          featureId: feature.id,
          sourceLayer: feature.sourceLayer,
          buildingName: feature.properties?.name,
          address: feature.properties?.address,
        };
      },
      catch: (error) => {
        if (error instanceof BuildingNotFoundError) {
          return error;
        }
        return new BuildingNotFoundError(
          `Error querying building: ${error}`,
          coordinates,
        );
      },
    }).pipe(
      Effect.tap((result) =>
        Effect.logInfo(
          `Found building: ${result.buildingName || "unnamed"} (ID: ${result.featureId})`,
        ),
      ),
    );
  }

  highlightBuilding(
    map: mapboxgl.Map,
    coordinates: { latitude: number; longitude: number },
    address?: StructuredAddress,
  ): Effect.Effect<void, BuildingNotFoundError | MapLayerNotReadyError, never> {
    const self = this;
    return Effect.gen(function* () {
      // Step 1: Clear any existing highlight
      yield* self.clearHighlight(map);

      // Step 2: Log attempt
      yield* Effect.logInfo(
        `Highlighting building at ${coordinates.latitude}, ${coordinates.longitude}` +
          (address ? ` (${address.streetNumber} ${address.streetName})` : ""),
      );

      // Step 3: Query building at coordinates
      const buildingResult = yield* self.queryBuilding(map, coordinates);

      // Step 4: Set feature-state to highlight the building
      yield* Effect.try({
        try: () => {
          // Set feature-state for highlighting
          map.setFeatureState(
            {
              source: "composite", // Mapbox default tileset
              sourceLayer: buildingResult.sourceLayer,
              id: buildingResult.featureId,
            },
            { highlight: true },
          );

          // Store for later cleanup
          self.currentHighlight = {
            source: "composite",
            sourceLayer: buildingResult.sourceLayer,
            id: buildingResult.featureId,
          };

          return Effect.logInfo(
            `Building highlighted: ${buildingResult.buildingName || "unnamed"}`,
          );
        },
        catch: (error) =>
          new MapLayerNotReadyError(`Failed to set feature-state: ${error}`),
      }).pipe(Effect.flatten);

      // Step 5: Update layer paint properties if not already set
      yield* self.ensureHighlightLayerStyle(map);
    });
  }

  clearHighlight(map: mapboxgl.Map): Effect.Effect<void, never, never> {
    return Effect.sync(() => {
      if (this.currentHighlight) {
        try {
          // Remove feature-state
          map.removeFeatureState(
            {
              source: this.currentHighlight.source,
              sourceLayer: this.currentHighlight.sourceLayer,
              id: this.currentHighlight.id,
            },
            "highlight",
          );

          Effect.runSync(Effect.logInfo("Cleared building highlight"));
        } catch (error) {
          // Silently fail if feature no longer exists
          Effect.runSync(
            Effect.logWarning(`Failed to clear highlight: ${error}`),
          );
        }

        this.currentHighlight = null;
      }
    });
  }

  /**
   * Ensure building layer has highlighting paint properties
   * This sets up the conditional styling based on feature-state
   */
  private ensureHighlightLayerStyle(
    map: mapboxgl.Map,
  ): Effect.Effect<void, never, never> {
    return Effect.sync(() => {
      // Try common building layer IDs
      const buildingLayers = [
        "building",
        "building-3d",
        "3d-buildings",
        "building-extrusion",
      ];

      for (const layerId of buildingLayers) {
        try {
          const layer = map.getLayer(layerId);
          if (layer) {
            // Set paint property to use highlight feature-state
            map.setPaintProperty(layerId, "fill-extrusion-color", [
              "case",
              ["boolean", ["feature-state", "highlight"], false],
              this.config.highlightColor,
              ["coalesce", ["get", "color"], this.config.defaultColor],
            ]);

            // Also set outline
            map.setPaintProperty(layerId, "fill-extrusion-opacity", [
              "case",
              ["boolean", ["feature-state", "highlight"], false],
              1.0,
              0.8,
            ]);

            Effect.runSync(
              Effect.logDebug(`Applied highlight styling to layer: ${layerId}`),
            );
          }
        } catch (error) {}
      }
    });
  }
}

/**
 * Service tag for dependency injection
 */
export const BuildingHighlightServiceTag =
  Context.GenericTag<BuildingHighlightService>("BuildingHighlightService");

/**
 * Live implementation layer
 */
export const BuildingHighlightServiceLive = Layer.succeed(
  BuildingHighlightServiceTag,
  new BuildingHighlightServiceImpl(),
).pipe(
  Layer.tap(() => Effect.logDebug("🏢 BuildingHighlightService initialized")),
);

/**
 * Helper function for client-side usage
 */
export const highlightBuildingEffect = (
  map: mapboxgl.Map,
  coordinates: { latitude: number; longitude: number },
  address?: StructuredAddress,
): Effect.Effect<
  void,
  BuildingNotFoundError | MapLayerNotReadyError,
  never
> => {
  return Effect.gen(function* () {
    const service = yield* BuildingHighlightServiceTag;
    return yield* service.highlightBuilding(map, coordinates, address);
  }).pipe(Effect.provide(BuildingHighlightServiceLive));
};

/**
 * Helper function to clear highlight
 */
export const clearBuildingHighlightEffect = (
  map: mapboxgl.Map,
): Effect.Effect<void, never, never> => {
  return Effect.gen(function* () {
    const service = yield* BuildingHighlightServiceTag;
    return yield* service.clearHighlight(map);
  }).pipe(Effect.provide(BuildingHighlightServiceLive));
};
