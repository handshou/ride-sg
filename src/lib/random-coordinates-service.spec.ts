import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
  generateRandomCoordinatesEffect,
  RandomCoordinatesServiceLive,
  RandomCoordinatesServiceTag,
} from "./random-coordinates-service";

describe("Random Coordinates Service - Live Functionality", () => {
  describe("Basic Functionality", () => {
    it("should generate random coordinates within Singapore bounds", async () => {
      const program = Effect.gen(function* () {
        const service = yield* RandomCoordinatesServiceTag;
        return yield* service.generateRandomCoordinates();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RandomCoordinatesServiceLive)),
      );

      expect(result).toHaveProperty("latitude");
      expect(result).toHaveProperty("longitude");
      expect(result.latitude).toBeGreaterThanOrEqual(1.16);
      expect(result.latitude).toBeLessThanOrEqual(1.47);
      expect(result.longitude).toBeGreaterThanOrEqual(103.6);
      expect(result.longitude).toBeLessThanOrEqual(104.0);
    });

    it("should generate different coordinates on multiple calls", async () => {
      const program = Effect.gen(function* () {
        const service = yield* RandomCoordinatesServiceTag;
        const coord1 = yield* service.generateRandomCoordinates();
        const coord2 = yield* service.generateRandomCoordinates();
        return { coord1, coord2 };
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RandomCoordinatesServiceLive)),
      );

      // Very unlikely to be the same (but not impossible)
      const isDifferent =
        result.coord1.latitude !== result.coord2.latitude ||
        result.coord1.longitude !== result.coord2.longitude;

      expect(isDifferent).toBe(true);
    });

    it("should work with the helper function", async () => {
      const result = await Effect.runPromise(generateRandomCoordinatesEffect());

      expect(result).toHaveProperty("latitude");
      expect(result).toHaveProperty("longitude");
      expect(result.latitude).toBeGreaterThanOrEqual(1.16);
      expect(result.latitude).toBeLessThanOrEqual(1.47);
      expect(result.longitude).toBeGreaterThanOrEqual(103.6);
      expect(result.longitude).toBeLessThanOrEqual(104.0);
    });
  });
});
