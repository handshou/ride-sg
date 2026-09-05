import { ManagedRuntime } from "effect";
import { ServerLayer } from "./src/lib/runtime/server-layer";

/**
 * Server Runtime Instrumentation
 *
 * This file is called ONCE when the Next.js server starts.
 * It creates a managed Effect runtime with all server-side services.
 *
 * The runtime is created using ManagedRuntime.make(), which:
 * - Initializes all services in ServerLayer
 * - Provides proper lifecycle management
 * - Enables efficient service reuse across requests
 *
 * This pattern eliminates the overhead of creating Effect contexts per-request.
 *
 * @see https://nextjs.org/docs/app/guides/instrumentation
 * @see https://effect.website/docs/runtime
 */

// biome-ignore lint/suspicious/noExplicitAny: Runtime type is complex, using any for now
let serverRuntime: any | undefined;
let serverRuntimeReady: Promise<void> | undefined;

/**
 * Register function called by Next.js on server startup
 *
 * Next.js calls this function once when:
 * - The server starts in development (pnpm dev)
 * - The server starts in production (after build)
 *
 * We check NEXT_RUNTIME to ensure we only initialize on Node.js runtime,
 * not Edge runtime (which has different constraints).
 *
 * ManagedRuntime.make() is synchronous, but ServerLayer contains adapters
 * that connect asynchronously (the PostgreSQL pool). Next.js awaits this
 * function, so we build the layer here. Without this the first runSync call
 * would fail with "Fiber cannot be resolved synchronously".
 */
export async function register() {
  // Only initialize on Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === "nodejs" || !process.env.NEXT_RUNTIME) {
    if (!serverRuntime) {
      try {
        serverRuntime = ManagedRuntime.make(ServerLayer);
        console.log("✅ Server runtime created");
      } catch (error) {
        console.error("❌ Server runtime initialization failed:", error);
        throw error;
      }
    }

    if (!serverRuntimeReady) {
      serverRuntimeReady = serverRuntime.runtime().then(() => {
        console.log("✅ Server runtime layer built");
      });
    }

    await serverRuntimeReady;
  }
}

// Ensure runtime is initialized on module load (backup for production)
if (typeof window === "undefined") {
  void register().catch((error) => {
    console.error("❌ Server runtime layer build failed:", error);
  });
}

/**
 * Get the server runtime instance
 *
 * Use this in server components and server actions to access the runtime.
 * The runtime provides all server-side services automatically.
 *
 * If the runtime isn't initialized yet (race condition), initialize it now.
 *
 * @example
 * ```typescript
 * import { getServerRuntime } from "../../instrumentation";
 * import { Effect } from "effect";
 * import { MapboxService } from "@/lib/services/mapbox-service";
 *
 * const runtime = getServerRuntime();
 * const result = await runtime.runPromise(
 *   Effect.gen(function* () {
 *     const mapbox = yield* MapboxService;
 *     return yield* mapbox.forwardGeocode("Singapore");
 *   })
 * );
 * ```
 */
export function getServerRuntime() {
  if (!serverRuntime) {
    // Lazy initialization as fallback (handles race conditions in production)
    console.warn("⚠️ Runtime not initialized, initializing now (lazy init)");
    void register().catch((error) => {
      console.error("❌ Server runtime layer build failed:", error);
    });
  }

  if (!serverRuntime) {
    throw new Error(
      "Server runtime failed to initialize. Check server logs for errors.",
    );
  }

  return serverRuntime;
}
