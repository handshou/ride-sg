import { Layer } from "effect";
import { BicycleParkingService } from "../services/bicycle-parking-service";
import { ConfigService } from "../services/config-service";
import { ConvexService } from "../services/convex-service";
import { ExaSearchService } from "../services/exa-search-service";
import { MapboxService } from "../services/mapbox-service";
import { RainfallService } from "../services/rainfall-service";
import { SearchStateService } from "../services/search-state-service";
import { VisionService } from "../services/vision-service";
import { WeatherService } from "../services/weather-service";
import { BaseLayer } from "./base-layer";

/**
 * Server Layer - Server-Only Services
 *
 * Extends BaseLayer with services that require server-side execution:
 * - MapboxService: Mapbox API with server-side secret token
 * - RainfallService: NEA Singapore Rainfall API
 * - BicycleParkingService: LTA DataMall API with secret key
 * - VisionService: OpenAI Vision API for image analysis
 * - WeatherService: NEA Weather API for temperature and humidity
 * - ExaSearchService: Exa AI search API for landmark identification
 * - SearchStateService: Shared search state management
 * - ConvexService: Convex database queries (fallback data source)
 *
 * These services use secret API keys and should NEVER be exposed to the client.
 */
export const ServerLayer = Layer.mergeAll(
  BaseLayer,
  MapboxService.Default,
  RainfallService.Default,
  BicycleParkingService.Default,
  VisionService.Default,
  WeatherService.Default,
  SearchStateService.Default,
  ExaSearchService.Default,
  ConvexService.Default,
).pipe(
  // Provide ConfigService to ensure services have access to configuration
  Layer.provide(ConfigService.Default),
);

/**
 * Type alias for all server services
 * Includes both base services and server-specific services
 */
export type ServerServices = typeof ServerLayer extends Layer.Layer<
  infer R,
  never,
  never
>
  ? R
  : never;
