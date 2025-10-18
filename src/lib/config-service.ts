import { Config } from "effect";

/**
 * Configuration for Mapbox access token
 */
export const mapboxTokenConfig = Config.string("MAPBOX_ACCESS_TOKEN").pipe(
  Config.withDefault("pk.test"),
  Config.withDescription(
    "Mapbox access token for geocoding and mapping services",
  ),
);
