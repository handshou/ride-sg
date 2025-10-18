import { Context, Effect, Layer } from "effect";

/**
 * Toast Service Interface
 *
 * Provides toast notification functionality using Sonner
 */
export interface ToastService {
  /**
   * Show a success toast
   */
  success(message: string): Effect.Effect<void, never>;

  /**
   * Show an error toast
   */
  error(message: string): Effect.Effect<void, never>;

  /**
   * Show a warning toast
   */
  warning(message: string): Effect.Effect<void, never>;

  /**
   * Show an info toast
   */
  info(message: string): Effect.Effect<void, never>;
}

/**
 * Toast Service Implementation
 */
export class ToastServiceImpl implements ToastService {
  success(message: string): Effect.Effect<void, never> {
    // In server components, we can't use client-side toasts
    // This will be handled by the UI layer
    return Effect.log(`✅ Toast Success: ${message}`);
  }

  error(message: string): Effect.Effect<void, never> {
    return Effect.logError(`❌ Toast Error: ${message}`);
  }

  warning(message: string): Effect.Effect<void, never> {
    return Effect.logWarning(`⚠️ Toast Warning: ${message}`);
  }

  info(message: string): Effect.Effect<void, never> {
    return Effect.logInfo(`ℹ️ Toast Info: ${message}`);
  }
}

/**
 * Context tag for ToastService
 */
export const ToastServiceTag = Context.GenericTag<ToastService>("ToastService");

/**
 * Live layer for ToastService
 */
export const ToastServiceLive = Layer.succeed(
  ToastServiceTag,
  new ToastServiceImpl(),
);

/**
 * Effect to show success toast
 */
export const showSuccessToast = (
  message: string,
): Effect.Effect<void, never> => {
  return Effect.gen(function* () {
    const toastService = yield* ToastServiceTag;
    return yield* toastService.success(message);
  }).pipe(
    Effect.provide(ToastServiceLive),
    Effect.catchAll(() => Effect.succeed(undefined)),
  );
};

/**
 * Effect to show error toast
 */
export const showErrorToast = (message: string): Effect.Effect<void, never> => {
  return Effect.gen(function* () {
    const toastService = yield* ToastServiceTag;
    return yield* toastService.error(message);
  }).pipe(
    Effect.provide(ToastServiceLive),
    Effect.catchAll(() => Effect.succeed(undefined)),
  );
};

/**
 * Effect to show warning toast
 */
export const showWarningToast = (
  message: string,
): Effect.Effect<void, never> => {
  return Effect.gen(function* () {
    const toastService = yield* ToastServiceTag;
    return yield* toastService.warning(message);
  }).pipe(
    Effect.provide(ToastServiceLive),
    Effect.catchAll(() => Effect.succeed(undefined)),
  );
};

/**
 * Effect to show info toast
 */
export const showInfoToast = (message: string): Effect.Effect<void, never> => {
  return Effect.gen(function* () {
    const toastService = yield* ToastServiceTag;
    return yield* toastService.info(message);
  }).pipe(
    Effect.provide(ToastServiceLive),
    Effect.catchAll(() => Effect.succeed(undefined)),
  );
};
