import { Effect } from "effect";

/**
 * Turbopack-safe Effect-TS runtime
 * 
 * This module provides a runtime that's specifically designed to work
 * with Turbopack and Next.js server components by avoiding complex
 * runtime initialization at module load time.
 */

/**
 * Turbopack-safe Effect runner
 * Uses Effect.runSync directly without custom runtime to avoid module evaluation issues
 */
export function runTurbopackSafeEffect<A, E>(
  program: Effect.Effect<A, E>
): A {
  try {
    return Effect.runSync(program);
  } catch (error) {
    console.error("Effect execution failed:", error);
    throw error;
  }
}

/**
 * Turbopack-safe async Effect runner
 */
export async function runTurbopackSafeEffectAsync<A, E>(
  program: Effect.Effect<A, E>
): Promise<A> {
  try {
    return await Effect.runPromise(program);
  } catch (error) {
    console.error("Async Effect execution failed:", error);
    throw error;
  }
}

/**
 * Create a hello world Effect that's safe for Turbopack
 */
export function createTurbopackSafeHelloWorldEffect(): Effect.Effect<string> {
  return Effect.gen(function* () {
    // Simple logging without complex service injection
    yield* Effect.sync(() => {
      console.log("[Effect-TS] Creating hello world message");
    });
    
    const message = "Hello World from Effect-TS!";
    
    yield* Effect.sync(() => {
      console.log(`[Effect-TS] Generated message: ${message}`);
    });
    
    return message;
  });
}

/**
 * Create a greeting Effect that's safe for Turbopack
 */
export function createTurbopackSafeGreetingEffect(name: string): Effect.Effect<string> {
  return Effect.gen(function* () {
    yield* Effect.sync(() => {
      console.log(`[Effect-TS] Creating greeting for: ${name}`);
    });
    
    const greeting = `Hello, ${name}! Welcome to Effect-TS in Next.js!`;
    
    yield* Effect.sync(() => {
      console.log(`[Effect-TS] Generated greeting: ${greeting}`);
    });
    
    return greeting;
  });
}

/**
 * Create a demonstration Effect with error handling
 */
export function createTurbopackSafeDemoEffect(): Effect.Effect<string> {
  return Effect.gen(function* () {
    yield* Effect.sync(() => {
      console.log("[Effect-TS] Starting demo effect");
    });
    
    // Simulate some work
    yield* Effect.sync(() => {
      console.log("[Effect-TS] Processing...");
    });
    
    const result = "Effect-TS is working perfectly with Turbopack!";
    
    yield* Effect.sync(() => {
      console.log(`[Effect-TS] Demo completed: ${result}`);
    });
    
    return result;
  });
}

/**
 * Create an Effect that demonstrates error handling
 */
export function createTurbopackSafeErrorHandlingEffect(): Effect.Effect<string> {
  return Effect.gen(function* () {
    yield* Effect.sync(() => {
      console.log("[Effect-TS] Starting error handling demo");
    });
    
    // This will always succeed, but demonstrates the pattern
    const result = yield* Effect.succeed("Error handling works correctly!");
    
    yield* Effect.sync(() => {
      console.log(`[Effect-TS] Error handling demo result: ${result}`);
    });
    
    return result;
  });
}
