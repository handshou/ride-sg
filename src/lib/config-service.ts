import { Config } from "effect";

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
 */
export const mapboxPublicTokenConfig = Config.string(
  "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN",
).pipe(
  Config.withDefault("pk.test"),
  Config.withDescription(
    "Mapbox access token for client-side interactive maps",
  ),
);

/**
 * Configuration for Exa API key (server-side only)
 */
export const exaApiKeyConfig = Config.string("EXA_API_KEY").pipe(
  Config.withDefault(""),
  Config.withDescription(
    "Exa API key for semantic search - server-side only, never expose to client",
  ),
);
