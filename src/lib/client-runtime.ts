import type { Effect } from "effect";
import { getClientRuntime } from "../../instrumentation-client";

/**
 * Next.js Client Component Runtime Helpers
 *
 * This module provides helper functions to run Effect programs in client contexts
 * using the managed runtime initialized in instrumentation-client.ts.
 *
 * The managed runtime is created ONCE before the app becomes interactive, providing:
 * - Better performance (no per-component runtime creation)
 * - Proper resource lifecycle management
 * - Consistent service availability
 *
 * @see instrumentation-client.ts for runtime initialization
 */

/**
 * Run an Effect program synchronously in a client component context
 *
 * Uses the managed client runtime initialized at startup.
 * The runtime automatically provides all client-side services.
 *
 * @param program - The Effect program to run
 * @returns The result of the Effect program
 *
 * @example
 * ```typescript
 * const position = runClientEffect(
 *   Effect.gen(function* () {
 *     const geo = yield* GeolocationService;
 *     return yield* geo.getCurrentPosition();
 *   })
 * );
 * ```
 */
export function runClientEffect<A, E, R>(program: Effect.Effect<A, E, R>): A {
  const runtime = getClientRuntime();
  // biome-ignore lint/suspicious/noExplicitAny: Runtime type inference is complex
  return runtime.runSync(program as any) as A;
}

/**
 * Run an Effect program asynchronously in a client component context
 *
 * Uses the managed client runtime initialized at startup.
 * The runtime automatically provides all client-side services.
 *
 * @param program - The Effect program to run
 * @returns Promise that resolves to the result of the Effect program
 *
 * @example
 * ```typescript
 * const isReady = await runClientEffectAsync(
 *   Effect.gen(function* () {
 *     const mapService = yield* MapReadinessService;
 *     return yield* mapService.waitForMapReady(mapInstance);
 *   })
 * );
 * ```
 */
export async function runClientEffectAsync<A, E, R>(
  program: Effect.Effect<A, E, R>,
): Promise<A> {
  const runtime = getClientRuntime();
  // biome-ignore lint/suspicious/noExplicitAny: Runtime type inference is complex
  return await runtime.runPromise(program as any);
}
