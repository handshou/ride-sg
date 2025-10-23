import { Config, Effect } from "effect";

/**
 * Unified Configuration Service
 *
 * Centralizes all application configuration using Effect.Service pattern.
 * Provides type-safe access to environment variables and API endpoints.
 */

export interface AppConfig {
  mapbox: {
    token: string;
    publicToken: string;
  };
  exa: {
    apiKey: string;
  };
  lta: {
    accountKey: string;
  };
  convex: {
    deployment: string;
    publicUrl: string;
  };
  urls: {
    mapboxGeocoding: string;
    mapboxDirections: string;
    mapboxIsochrone: string;
    mapboxStaticImage: string;
    nominatim: string;
    neaRainfall: string;
  };
}

/**
 * ConfigService as Effect.Service
 * Provides centralized configuration management
 */
export class ConfigService extends Effect.Service<ConfigService>()(
  "ConfigService",
  {
    effect: Effect.gen(function* () {
      yield* Effect.logDebug(
        "⚙️ ConfigService loading environment variables...",
      );
      // Load all configs in parallel
      const config: AppConfig = {
        mapbox: {
          token: yield* Config.string("MAPBOX_ACCESS_TOKEN").pipe(
            Config.withDefault("pk.test"),
            Config.withDescription(
              "Mapbox access token for server-side geocoding and mapping services",
            ),
          ),
          publicToken: yield* Config.string(
            "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN",
          ).pipe(
            Config.withDefault("pk.test"),
            Config.withDescription(
              "Mapbox public access token for client-side map rendering",
            ),
          ),
        },
        exa: {
          apiKey: yield* Config.string("EXA_API_KEY").pipe(
            Config.withDefault(""),
            Config.withDescription(
              "Exa API key for semantic search - server-side only, never expose to client",
            ),
          ),
        },
        lta: {
          accountKey: yield* Config.string("LTA_ACCOUNT_KEY").pipe(
            Config.withDefault(""),
            Config.withDescription(
              "LTA DataMall AccountKey for API access - server-side only, never expose to client",
            ),
          ),
        },
        convex: {
          deployment: yield* Config.string("CONVEX_DEPLOYMENT").pipe(
            Config.withDefault(""),
            Config.withDescription(
              "Convex deployment URL for database operations - server-side only",
            ),
          ),
          publicUrl: yield* Config.string("NEXT_PUBLIC_CONVEX_URL").pipe(
            Config.withDefault(""),
            Config.withDescription(
              "Convex public URL for client-side database subscriptions",
            ),
          ),
        },
        urls: {
          mapboxGeocoding: "https://api.mapbox.com/geocoding/v5/mapbox.places",
          mapboxDirections: "https://api.mapbox.com/directions/v5/mapbox",
          mapboxIsochrone: "https://api.mapbox.com/isochrone/v1/mapbox",
          mapboxStaticImage: "https://api.mapbox.com/styles/v1",
          nominatim: "https://nominatim.openstreetmap.org",
          neaRainfall: "https://api-open.data.gov.sg/v2/real-time/api/rainfall",
        },
      };

      return config;
    }),
    dependencies: [],
  },
) {}

/**
 * Legacy exports for backwards compatibility during migration
 * These will be removed once all services are migrated
 */

export const mapboxTokenConfig = Config.string("MAPBOX_ACCESS_TOKEN").pipe(
  Config.withDefault("pk.test"),
  Config.withDescription(
    "Mapbox access token for geocoding and mapping services",
  ),
);

export const mapboxPublicTokenConfig = Effect.sync(
  () => process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "pk.test",
);

export const exaApiKeyConfig = Config.string("EXA_API_KEY").pipe(
  Config.withDefault(""),
  Config.withDescription(
    "Exa API key for semantic search - server-side only, never expose to client",
  ),
);

export const convexDeploymentConfig = Config.string("CONVEX_DEPLOYMENT").pipe(
  Config.withDefault(""),
  Config.withDescription(
    "Convex deployment URL for database operations - server-side only",
  ),
);

export const convexPublicDeploymentConfig = Effect.sync(
  () => process.env.NEXT_PUBLIC_CONVEX_URL || "",
);

export const ltaAccountKeyConfig = Config.string("LTA_ACCOUNT_KEY").pipe(
  Config.withDefault(""),
  Config.withDescription(
    "LTA DataMall AccountKey for API access - server-side only, never expose to client",
  ),
);
