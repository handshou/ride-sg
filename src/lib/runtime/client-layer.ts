import { Layer } from "effect";
import { CameraServiceLive } from "../services/camera-service";
import { CrossBorderNavigationServiceLive } from "../services/cross-border-navigation-service";
import { GeolocationServiceLive } from "../services/geolocation-service";
import { ImageCaptureServiceLive } from "../services/image-capture-service";
import { MapNavigationServiceLive } from "../services/map-navigation-service";
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
 * - CameraService: Browser MediaDevices API (navigator.mediaDevices)
 * - ImageCaptureService: Canvas-based image capture from video streams
 * - MapNavigationService: General-purpose map flyTo navigation
 * - CrossBorderNavigationService: Cross-border city detection and navigation
 *
 * These services use browser-only APIs and will fail on the server.
 *
 * Note: SearchStateService will be added as it's migrated to the new pattern.
 */
/**
 * CrossBorderNavigationService depends on MapNavigationService.
 * We merge both services and then use provide to satisfy the dependency.
 */
const BaseWithAllServices = Layer.mergeAll(
  BaseLayer,
  GeolocationServiceLive,
  MapReadinessServiceLive,
  ThemeSyncServiceLive,
  CameraServiceLive,
  ImageCaptureServiceLive,
  MapNavigationServiceLive,
  CrossBorderNavigationServiceLive,
);

/**
 * Provide MapNavigationService to CrossBorderNavigationService
 * Using Layer.provide ensures the dependency is satisfied at runtime
 */
export const ClientLayer = Layer.provide(
  BaseWithAllServices,
  MapNavigationServiceLive,
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
