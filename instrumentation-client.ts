import { ManagedRuntime } from "effect";
import { ClientLayer } from "./src/lib/runtime/client-layer";

/**
 * Client Runtime Instrumentation
 *
 * This file runs BEFORE the Next.js app becomes interactive on the client.
 * It creates a managed Effect runtime with all client-side services.
 *
 * The runtime is created using ManagedRuntime.make(), which:
 * - Initializes all services in ClientLayer
 * - Provides proper lifecycle management
 * - Enables efficient service reuse across components
 *
 * Unlike server instrumentation, client instrumentation runs immediately
 * at module initialization (not in an async function).
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
 * @see https://effect.website/docs/runtime
 */

/**
 * Client runtime instance
 *
 * Created immediately at module load time, before any React components render.
 * This ensures all client components have access to services from the start.
 */
const clientRuntime = ManagedRuntime.make(ClientLayer);

// Simple lifecycle log - service details logged by layers themselves
console.log("✅ Client runtime initialized");

/**
 * Get the client runtime instance
 *
 * Use this in client components to access the runtime.
 * The runtime provides all client-side services automatically.
 *
 * @example
 * ```typescript
 * import { getClientRuntime } from "../../instrumentation-client";
 * import { Effect } from "effect";
 * import { GeolocationService } from "@/lib/services/geolocation-service";
 *
 * const runtime = getClientRuntime();
 * const position = await runtime.runPromise(
 *   Effect.gen(function* () {
 *     const geo = yield* GeolocationService;
 *     return yield* geo.getCurrentPosition();
 *   })
 * );
 * ```
 */
export function getClientRuntime() {
  return clientRuntime;
}

/**
 * Optional: Navigation transition tracking
 *
 * This function is called by Next.js when a client-side navigation begins.
 * Use it to track or log navigation events.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client#onRouterTransitionStart
 */
export function onRouterTransitionStart() {
  if (process.env.NODE_ENV === "development") {
    console.log("🔄 Client-side navigation started");
  }
}
