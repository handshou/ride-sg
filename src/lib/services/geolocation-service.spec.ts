import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GeolocationServiceLive,
  GeolocationServiceTag,
  getCurrentPositionEffect,
} from "./geolocation-service";

// Mock the browser geolocation API
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
};

// Ensure navigator exists in the global scope
if (typeof global.navigator === "undefined") {
  (global as typeof globalThis & { navigator: Navigator }).navigator =
    {} as Navigator;
}

Object.defineProperty(global.navigator, "geolocation", {
  value: mockGeolocation,
  writable: true,
});

describe("Geolocation Service - Live Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Basic Functionality", () => {
    it("should get current position successfully", async () => {
      const mockPosition = {
        coords: {
          latitude: 1.3521,
          longitude: 103.8198,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (successCallback) => {
          successCallback(mockPosition);
        },
      );

      const program = Effect.gen(function* () {
        const service = yield* GeolocationServiceTag;
        return yield* service.getCurrentPosition();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(GeolocationServiceLive)),
      );

      expect(result).toEqual({
        latitude: 1.3521,
        longitude: 103.8198,
      });
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        }),
      );
    });

    it("should handle permission denied error", async () => {
      const mockError = {
        code: 1, // PERMISSION_DENIED
        message: "User denied geolocation",
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (_successCallback, errorCallback) => {
          errorCallback(mockError);
        },
      );

      const program = Effect.gen(function* () {
        const service = yield* GeolocationServiceTag;
        return yield* service.getCurrentPosition();
      });

      await expect(
        Effect.runPromise(program.pipe(Effect.provide(GeolocationServiceLive))),
      ).rejects.toThrow("Location access denied by user");
    });

    it("should handle position unavailable error", async () => {
      const mockError = {
        code: 2, // POSITION_UNAVAILABLE
        message: "Position unavailable",
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (_successCallback, errorCallback) => {
          errorCallback(mockError);
        },
      );

      const program = Effect.gen(function* () {
        const service = yield* GeolocationServiceTag;
        return yield* service.getCurrentPosition();
      });

      await expect(
        Effect.runPromise(program.pipe(Effect.provide(GeolocationServiceLive))),
      ).rejects.toThrow("Location information is unavailable");
    });

    it("should handle timeout error", async () => {
      const mockError = {
        code: 3, // TIMEOUT
        message: "Request timeout",
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (_successCallback, errorCallback) => {
          errorCallback(mockError);
        },
      );

      const program = Effect.gen(function* () {
        const service = yield* GeolocationServiceTag;
        return yield* service.getCurrentPosition();
      });

      await expect(
        Effect.runPromise(program.pipe(Effect.provide(GeolocationServiceLive))),
      ).rejects.toThrow("Location request timed out");
    });

    it("should propagate errors from the helper function", async () => {
      const mockError = {
        code: 1, // PERMISSION_DENIED
        message: "User denied geolocation",
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (_successCallback, errorCallback) => {
          errorCallback(mockError);
        },
      );

      // The helper function should now propagate errors (no fallback)
      await expect(Effect.runPromise(getCurrentPositionEffect())).rejects.toThrow(
        /Location access denied by user/,
      );
    });

    it("should handle geolocation not supported", async () => {
      // Mock navigator.geolocation as undefined
      Object.defineProperty(global.navigator, "geolocation", {
        value: undefined,
        writable: true,
      });

      const program = Effect.gen(function* () {
        const service = yield* GeolocationServiceTag;
        return yield* service.getCurrentPosition();
      });

      await expect(
        Effect.runPromise(program.pipe(Effect.provide(GeolocationServiceLive))),
      ).rejects.toThrow("Geolocation is not supported by this browser");

      // Restore the mock
      Object.defineProperty(global.navigator, "geolocation", {
        value: mockGeolocation,
        writable: true,
      });
    });
  });
});
