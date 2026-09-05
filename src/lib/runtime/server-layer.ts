import { Layer } from "effect";
import { ConfiguredPostgresClientLayer } from "../database/postgres-client-layer";
import { PostgresBicycleParkingCacheRepositoryLayer } from "../repositories/postgres-bicycle-parking-cache-repository";
import { PostgresCapturedImageRepositoryLayer } from "../repositories/postgres-captured-image-repository";
import { PostgresImageBlobStoreLayer } from "../repositories/postgres-image-blob-store";
import { PostgresLocationRepositoryLayer } from "../repositories/postgres-location-repository";
import { PostgresRainfallRepositoryLayer } from "../repositories/postgres-rainfall-repository";
import { BicycleParkingService } from "../services/bicycle-parking-service";
import { CapturedImageService } from "../services/captured-image-service";
import { ConfigService } from "../services/config-service";
import { DatabaseSearchService } from "../services/database-search-service";
import { ExaSearchService } from "../services/exa-search-service";
import { MapboxService } from "../services/mapbox-service";
import { RainfallService } from "../services/rainfall-service";
import { SearchStateService } from "../services/search-state-service";
import { VisionService } from "../services/vision-service";
import { WeatherService } from "../services/weather-service";
import { BaseLayer } from "./base-layer";

/**
 * Persistence Layer - Repository Ports Bound to PostgreSQL Adapters
 *
 * Application code depends only on the port tags (LocationRepository,
 * RainfallRepository, BicycleParkingCacheRepository, CapturedImageRepository,
 * ImageBlobStore). Swapping a provider means swapping one adapter here.
 *
 * All adapters share the single configured PgClient pool.
 */
export const PersistenceLayer = Layer.mergeAll(
  PostgresLocationRepositoryLayer,
  PostgresRainfallRepositoryLayer,
  PostgresBicycleParkingCacheRepositoryLayer,
  PostgresCapturedImageRepositoryLayer,
  PostgresImageBlobStoreLayer,
).pipe(Layer.provide(ConfiguredPostgresClientLayer));

/**
 * Server Layer - Server-Only Services
 *
 * Extends BaseLayer with services that require server-side execution:
 * - MapboxService: Mapbox API with server-side secret token
 * - RainfallService: NEA Singapore Rainfall API
 * - BicycleParkingService: LTA DataMall API with secret key, cached via repository
 * - VisionService: OpenAI Vision API for image analysis
 * - WeatherService: NEA Weather API for temperature and humidity
 * - ExaSearchService: Exa AI search API for landmark identification
 * - SearchStateService: Shared search state management
 * - DatabaseSearchService: Saved-location search via LocationRepository
 * - CapturedImageService: Captured image metadata plus blob storage
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
  DatabaseSearchService.Default,
  CapturedImageService.Default,
).pipe(
  // Repositories are both provided to services and exported for direct use
  Layer.provideMerge(PersistenceLayer),
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
