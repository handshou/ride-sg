import { Layer } from "effect";
import { GeolocationServiceLive } from "../services/geolocation-service";
import { MapReadinessServiceLive } from "../services/map-readiness-service";
import { ThemeSyncServiceLive } from "../services/theme-sync-service";
import { BaseLayer } from "./base-layer";

/**
 * Client Layer - Client-Only Services
 *
 * Extends BaseLayer with services that require browser APIs or DOM:
 * - GeolocationService: Browser Geolocation API (navigator.geolocation)
 * - MapReadinessService: Mapbox GL map readiness checks (DOM-dependent)
 * - ThemeSyncService: Theme/map style synchronization (window.matchMedia)
 *
 * These services use browser-only APIs and will fail on the server.
 *
 * Note: SearchStateService will be added as it's migrated to the new pattern.
 */
export const ClientLayer = Layer.mergeAll(
  BaseLayer,
  GeolocationServiceLive,
  MapReadinessServiceLive,
  ThemeSyncServiceLive,
);

/**
 * Type alias for all client services
 * Includes both base services and client-specific services
 */
export type ClientServices = typeof ClientLayer extends Layer.Layer<
  infer R,
  never,
  never
>
  ? R
  : never;
