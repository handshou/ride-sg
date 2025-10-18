import { Effect, Context, Layer } from "effect";

/**
 * Message Service for Next.js Server Components
 * 
 * This service provides message functionality with proper Effect Context patterns.
 */

/**
 * Message type representing a message in the system
 */
export interface Message {
  readonly id: string;
  readonly text: string;
  readonly timestamp: Date;
  readonly type: MessageType;
}

/**
 * Message type enumeration
 */
export type MessageType = "info" | "success" | "warning" | "error";

/**
 * Data required to create a new message
 */
export interface CreateMessageData {
  readonly text: string;
  readonly type?: MessageType;
}

/**
 * Message service interface for dependency injection
 */
export interface MessageService {
  readonly getMessage: (id: string) => Effect.Effect<Message, never>;
  readonly getAllMessages: () => Effect.Effect<ReadonlyArray<Message>, never>;
  readonly createMessage: (data: CreateMessageData) => Effect.Effect<Message, never>;
}

// Service tag for dependency injection
export const MessageServiceTag = Context.GenericTag<MessageService>("MessageService");

// Service implementation
export class MessageServiceImpl implements MessageService {
  private readonly messages: Message[] = [
    {
      id: "1",
      text: "Welcome to Effect-TS with Next.js!",
      timestamp: new Date(),
      type: "success"
    },
    {
      id: "2", 
      text: "This message is powered by Effect Context!",
      timestamp: new Date(),
      type: "info"
    },
    {
      id: "3",
      text: "Server components with Effect-TS are awesome!",
      timestamp: new Date(),
      type: "success"
    }
  ];

  getMessage = (id: string): Effect.Effect<Message, never> => {
    const self = this;
    return Effect.gen(function* () {
      yield* Effect.log(`Fetching message with id: ${id}`);
      
      // Use synchronous operation for better performance
      const found = self.messages.find((m: Message) => m.id === id);
      const message = found || {
        id,
        text: "Message not found",
        timestamp: new Date(),
        type: "error" as const
      };
      
      yield* Effect.log(`Retrieved message: ${message.text}`);
      return message;
    });
  };

  getAllMessages = (): Effect.Effect<ReadonlyArray<Message>, never> => {
    const self = this;
    return Effect.gen(function* () {
      yield* Effect.log("Fetching all messages");
      
      // Use synchronous operation for better performance
      const messages = self.messages;
      
      yield* Effect.log(`Retrieved ${messages.length} messages`);
      return messages;
    });
  };

  createMessage = (data: CreateMessageData): Effect.Effect<Message, never> => {
    const self = this;
    return Effect.gen(function* () {
      yield* Effect.log(`Creating message: ${data.text}`);
      
      const message: Message = {
        id: Math.random().toString(),
        text: data.text,
        timestamp: new Date(),
        type: data.type ?? "info"
      };
      
      // Add to messages array
      self.messages.push(message);
      
      yield* Effect.log(`Created message with id: ${message.id}`);
      return message;
    });
  };
}

// Layer for the service
export const MessageServiceLive = Layer.succeed(
  MessageServiceTag,
  new MessageServiceImpl()
);

/**
 * Effect function to get a message by ID
 */
export const getMessageEffect = (id: string): Effect.Effect<Message, never, MessageService> => {
  return Effect.gen(function* () {
    const messageService = yield* MessageServiceTag;
    return yield* messageService.getMessage(id);
  });
};

/**
 * Effect function to get all messages
 */
export const getAllMessagesEffect = (): Effect.Effect<ReadonlyArray<Message>, never, MessageService> => {
  return Effect.gen(function* () {
    const messageService = yield* MessageServiceTag;
    return yield* messageService.getAllMessages();
  });
};

/**
 * Effect function to create a new message
 */
export const createMessageEffect = (data: CreateMessageData): Effect.Effect<Message, never, MessageService> => {
  return Effect.gen(function* () {
    const messageService = yield* MessageServiceTag;
    return yield* messageService.createMessage(data);
  });
};
