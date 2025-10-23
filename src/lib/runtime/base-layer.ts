import { Layer } from "effect";
import { ConfigService } from "../services/config-service";
import { ToastServiceLive } from "../services/toast-service";

/**
 * Base Layer - Shared Services
 *
 * Services available in both server and client contexts:
 * - ConfigService: Environment variable access
 * - ToastService: Logging-based toast notifications
 *
 * This layer is extended by ServerLayer and ClientLayer.
 */
export const BaseLayer = Layer.mergeAll(
  ConfigService.Default,
  ToastServiceLive,
);

/**
 * Type alias for base services
 * Useful for type annotations when services need only base dependencies
 */
export type BaseServices = ConfigService | typeof ToastServiceLive;
