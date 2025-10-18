import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { ToastServiceLive, ToastServiceTag } from "./toast-service";

describe("Toast Service - Live Functionality", () => {
  describe("Basic Toast Operations", () => {
    it("should show success toast", async () => {
      const program = Effect.gen(function* () {
        const toastService = yield* ToastServiceTag;
        return yield* toastService.success("Test success message");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ToastServiceLive)),
      );

      expect(result).toBeUndefined(); // Success toast doesn't return a value
    });

    it("should show warning toast", async () => {
      const program = Effect.gen(function* () {
        const toastService = yield* ToastServiceTag;
        return yield* toastService.warning("Test warning message");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ToastServiceLive)),
      );

      expect(result).toBeUndefined(); // Warning toast doesn't return a value
    });

    it("should show error toast", async () => {
      const program = Effect.gen(function* () {
        const toastService = yield* ToastServiceTag;
        return yield* toastService.error("Test error message");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ToastServiceLive)),
      );

      expect(result).toBeUndefined(); // Error toast doesn't return a value
    });

    it("should show info toast", async () => {
      const program = Effect.gen(function* () {
        const toastService = yield* ToastServiceTag;
        return yield* toastService.info("Test info message");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ToastServiceLive)),
      );

      expect(result).toBeUndefined(); // Info toast doesn't return a value
    });
  });

  describe("Effect Integration", () => {
    it("should work with Effect.gen", async () => {
      const program = Effect.gen(function* () {
        const toastService = yield* ToastServiceTag;
        yield* toastService.success("Effect success");
        yield* toastService.warning("Effect warning");
        return "completed";
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ToastServiceLive)),
      );

      expect(result).toBe("completed");
    });

    it("should work with Effect.catchAll", async () => {
      const program = Effect.gen(function* () {
        yield* Effect.fail("Simulated error");
        return "success";
      }).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            const toastService = yield* ToastServiceTag;
            yield* toastService.error(`Caught error: ${error}`);
            return "fallback";
          }),
        ),
      );

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ToastServiceLive)),
      );

      expect(result).toBe("fallback");
    });
  });
});
