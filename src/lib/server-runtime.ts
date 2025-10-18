import { Effect, Layer } from "effect";
import { 
  MessageServiceLive, 
  MessageService,
  Message,
  CreateMessageData,
  getMessageEffect,
  getAllMessagesEffect,
  createMessageEffect
} from "./message-service";

/**
 * Next.js Server Component Runtime
 * 
 * This runtime is specifically designed for Next.js server components
 * with proper Effect Context and dependency injection.
 * 
 * Uses Effect.runSync directly to avoid Turbopack module resolution issues.
 */

// Combined layer with all services
export const ServerLayer = Layer.mergeAll(
  MessageServiceLive
);

/**
 * Run an Effect program in a Next.js server component context
 * 
 * @param program - The Effect program to run
 * @returns The result of the Effect program
 */
export function runServerEffect<A, E, R>(
  program: Effect.Effect<A, E, R>
): A {
  return Effect.runSync(
    program.pipe(
      Effect.provide(ServerLayer)
    ) as Effect.Effect<A, E, never>
  );
}

/**
 * Run an Effect program asynchronously in a Next.js server component context
 * 
 * @param program - The Effect program to run
 * @returns Promise that resolves to the result of the Effect program
 */
export async function runServerEffectAsync<A, E, R>(
  program: Effect.Effect<A, E, R>
): Promise<A> {
  return await Effect.runPromise(
    program.pipe(
      Effect.provide(ServerLayer)
    ) as Effect.Effect<A, E, never>
  );
}

/**
 * Create a simple hello world Effect using the message service
 */
export const createHelloWorldEffect = (): Effect.Effect<string, never, MessageService> => {
  return Effect.gen(function* () {
    yield* Effect.log("Creating hello world message");
    
    // Use the message service to get a message
    const message = yield* getMessageEffect("1");
    
    yield* Effect.log(`Retrieved message: ${message.text}`);
    
    return message.text;
  });
};

/**
 * Create a greeting Effect using the message service
 */
export const createGreetingEffect = (name: string): Effect.Effect<string, never, MessageService> => {
  return Effect.gen(function* () {
    yield* Effect.log(`Creating greeting for: ${name}`);
    
    // Create a new message using the service
    const message = yield* createMessageEffect({
      text: `Hello, ${name}! Welcome to Effect-TS with Next.js!`,
      type: "success"
    });
    
    yield* Effect.log(`Created greeting message: ${message.text}`);
    
    return message.text;
  });
};

/**
 * Create a demo Effect that shows all messages
 */
export const createDemoEffect = (): Effect.Effect<string, never, MessageService> => {
  return Effect.gen(function* () {
    yield* Effect.log("Creating demo effect");
    
    // Get all messages
    const messages = yield* getAllMessagesEffect();
    
    yield* Effect.log(`Retrieved ${messages.length} messages`);
    
    return `Found ${messages.length} messages in the system!`;
  });
};

// Message service functions are imported above

/**
 * Helper function to get a message with proper context
 */
export const getMessage = (id: string): Effect.Effect<Message, never> => {
  return getMessageEffect(id).pipe(Effect.provide(ServerLayer));
};

/**
 * Helper function to get all messages with proper context
 */
export const getAllMessages = (): Effect.Effect<ReadonlyArray<Message>, never> => {
  return getAllMessagesEffect().pipe(Effect.provide(ServerLayer));
};

/**
 * Helper function to create a message with proper context
 */
export const createMessage = (data: CreateMessageData): Effect.Effect<Message, never> => {
  return createMessageEffect(data).pipe(Effect.provide(ServerLayer));
};
