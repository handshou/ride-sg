import { Config, Effect } from "effect";

/**
 * Configuration for Mapbox access token (server-side)
 */
export const mapboxTokenConfig = Config.string("MAPBOX_ACCESS_TOKEN").pipe(
  Config.withDefault("pk.test"),
  Config.withDescription(
    "Mapbox access token for geocoding and mapping services",
  ),
);

/**
 * Configuration for Mapbox access token (client-side)
 * Uses direct process.env access for client-side compatibility
 */
export const mapboxPublicTokenConfig = Effect.sync(
  () => process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "pk.test",
);

/**
 * Configuration for Exa API key (server-side only - NEVER expose to client)
 */
export const exaApiKeyConfig = Config.string("EXA_API_KEY").pipe(
  Config.withDefault(""),
  Config.withDescription(
    "Exa API key for semantic search - server-side only, never expose to client",
  ),
);

/**
 * Configuration for Convex deployment URL (server-side)
 */
export const convexDeploymentConfig = Config.string("CONVEX_DEPLOYMENT").pipe(
  Config.withDefault(""),
  Config.withDescription(
    "Convex deployment URL for database operations - server-side only",
  ),
);

/**
 * Configuration for Convex deployment URL (client-side)
 * Uses direct process.env access for client-side compatibility
 */
export const convexPublicDeploymentConfig = Effect.sync(
  () => process.env.NEXT_PUBLIC_CONVEX_URL || "",
);
