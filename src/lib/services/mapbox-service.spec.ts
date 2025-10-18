import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { MapboxServiceLive, MapboxServiceTag } from "./mapbox-service";

describe("Mapbox Service - Live Functionality", () => {
  describe("Basic Functionality", () => {
    it("should get Singapore locations", async () => {
      const program = Effect.gen(function* () {
        const mapboxService = yield* MapboxServiceTag;
        return yield* mapboxService.forwardGeocode("Singapore");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(MapboxServiceLive)),
      );

      expect(result).toHaveLength(1);
      expect(result[0].address).toContain("Singapore");
      expect(result[0]).toHaveProperty("coordinates");
      expect(result[0].coordinates).toHaveProperty("latitude");
      expect(result[0].coordinates).toHaveProperty("longitude");
    });

    it("should get random Singapore coordinates", async () => {
      const program = Effect.gen(function* () {
        const mapboxService = yield* MapboxServiceTag;
        return yield* mapboxService.getRandomSingaporeCoords();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(MapboxServiceLive)),
      );

      expect(result).toHaveProperty("latitude");
      expect(result).toHaveProperty("longitude");
      expect(result.latitude).toBeGreaterThanOrEqual(1.16);
      expect(result.latitude).toBeLessThanOrEqual(1.47);
      expect(result.longitude).toBeGreaterThanOrEqual(103.6);
      expect(result.longitude).toBeLessThanOrEqual(104.0);
    });

    it("should generate static map URL", async () => {
      const program = Effect.gen(function* () {
        const mapboxService = yield* MapboxServiceTag;
        return yield* mapboxService.getStaticMap(
          { longitude: 103.8, latitude: 1.3 },
          12,
          { width: 400, height: 300 },
        );
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(MapboxServiceLive)),
      );

      expect(result).toContain("api.mapbox.com");
      expect(result).toContain("103.8,1.3");
      expect(result).toContain("400x300");
      expect(result).toContain("access_token");
    });
  });
});
