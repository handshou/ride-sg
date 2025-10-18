import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
  getCurrentLocation,
  getRandomSingaporeCoords,
  getSingaporeLocation,
  getStaticMap,
} from "./server-runtime";

describe("Server Runtime - Live Functionality", () => {
  describe("getSingaporeLocation", () => {
    it("should return Singapore location data", async () => {
      const result = await Effect.runPromise(getSingaporeLocation());

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("address");
      expect(result[0]).toHaveProperty("coordinates");
      expect(result[0].coordinates).toHaveProperty("latitude");
      expect(result[0].coordinates).toHaveProperty("longitude");
    });
  });

  describe("getCurrentLocation", () => {
    it("should return current location data", async () => {
      const result = await Effect.runPromise(getCurrentLocation());

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("address");
      expect(result[0]).toHaveProperty("coordinates");
    });
  });

  describe("getRandomSingaporeCoords", () => {
    it("should return random coordinates within Singapore bounds", async () => {
      const result = await Effect.runPromise(getRandomSingaporeCoords());

      expect(result).toHaveProperty("latitude");
      expect(result).toHaveProperty("longitude");
      expect(result.latitude).toBeGreaterThanOrEqual(1.16);
      expect(result.latitude).toBeLessThanOrEqual(1.47);
      expect(result.longitude).toBeGreaterThanOrEqual(103.6);
      expect(result.longitude).toBeLessThanOrEqual(104.0);
    });

    it("should return different coordinates on multiple calls", async () => {
      const result1 = await Effect.runPromise(getRandomSingaporeCoords());
      const result2 = await Effect.runPromise(getRandomSingaporeCoords());

      // Very unlikely to be the same (but not impossible)
      const isDifferent =
        result1.latitude !== result2.latitude ||
        result1.longitude !== result2.longitude;

      expect(isDifferent).toBe(true);
    });
  });

  describe("getStaticMap", () => {
    it("should return a valid map URL", async () => {
      const coords = { longitude: 103.8, latitude: 1.3 };
      const result = await Effect.runPromise(
        getStaticMap(coords, 12, { width: 400, height: 300 }),
      );

      expect(result).toContain("api.mapbox.com");
      expect(result).toContain("103.8,1.3");
      expect(result).toContain("400x300");
      expect(result).toContain("access_token");
    });
  });
});
