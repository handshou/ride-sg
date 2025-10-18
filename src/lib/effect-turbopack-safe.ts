import { Effect } from "effect";

/**
 * Effect-TS runtime for Next.js server components
 * 
 * This module provides a runtime that's specifically designed to work
 * with Next.js server components by avoiding complex runtime initialization.
 */

// Simple message type for our application
export interface Message {
  text: string;
  timestamp: Date;
  level: "info" | "success" | "warning" | "error";
}

/**
 * Simple Effect runner
 * Uses Effect.runSync directly without custom runtime
 */
export function runEffect<A, E>(
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
 * Async Effect runner
 */
export async function runEffectAsync<A, E>(
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
 * Create a hello world Effect with Effect.log
 */
export function createHelloEffect(): Effect.Effect<string, never, never> {
  return Effect.gen(function* () {
    yield* Effect.log("Creating hello world message");
    
    const message = "Hello World from Effect-TS!";
    
    yield* Effect.log(`Generated message: ${message}`);
    
    return message;
  });
}

/**
 * Create a greeting Effect with type validation
 */
export function createGreetingEffect(name: string): Effect.Effect<string, never, never> {
  return Effect.gen(function* () {
    yield* Effect.log(`Creating greeting for: ${name}`);
    
    // Create a message object with proper typing
    const messageData: Message = {
      text: `Hello, ${name}! Welcome to Effect-TS in Next.js!`,
      timestamp: new Date(),
      level: "success"
    };
    
    yield* Effect.log(`Generated greeting: ${messageData.text}`);
    
    return messageData.text;
  });
}

/**
 * Create a demo Effect with Effect.log
 */
export function createDemoEffect(): Effect.Effect<string, never, never> {
  return Effect.gen(function* () {
    yield* Effect.log("Starting demo effect");
    
    // Simulate some work
    yield* Effect.log("Processing...");
    
    const result = "Effect-TS is working perfectly!";
    
    yield* Effect.log(`Demo completed: ${result}`);
    
    return result;
  });
}

/**
 * Create an Effect that demonstrates error handling with Effect.log
 */
export function createErrorHandlingEffect(): Effect.Effect<string, never, never> {
  return Effect.gen(function* () {
    yield* Effect.log("Starting error handling demo");
    
    // This will always succeed, but demonstrates the pattern
    const result = yield* Effect.succeed("Error handling works correctly!");
    
    yield* Effect.log(`Error handling demo result: ${result}`);
    
    return result;
  });
}
