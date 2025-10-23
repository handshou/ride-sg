import { beforeAll, describe, expect, it } from "vitest";
import {
  getCurrentLocation,
  getRandomSingaporeCoords,
  getSingaporeLocation,
  getStaticMap,
  runServerEffectAsync,
} from "./server-runtime";

describe("Server Runtime - Live Functionality", () => {
  // Initialize the server runtime before running tests
  beforeAll(async () => {
    // Set NEXT_RUNTIME to nodejs for testing
    process.env.NEXT_RUNTIME = "nodejs";

    // Import and call register from instrumentation (synchronous)
    const { register } = await import("../../instrumentation");
    register();
  });

  describe("getSingaporeLocation", () => {
    it("should return Singapore location data", async () => {
      const result = await runServerEffectAsync(getSingaporeLocation());

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
      const result = await runServerEffectAsync(getCurrentLocation());

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("address");
      expect(result[0]).toHaveProperty("coordinates");
    });
  });

  describe("getRandomSingaporeCoords", () => {
    it("should return random coordinates within Singapore bounds", async () => {
      const result = await runServerEffectAsync(getRandomSingaporeCoords());

      expect(result).toHaveProperty("latitude");
      expect(result).toHaveProperty("longitude");
      expect(result.latitude).toBeGreaterThanOrEqual(1.16);
      expect(result.latitude).toBeLessThanOrEqual(1.47);
      expect(result.longitude).toBeGreaterThanOrEqual(103.6);
      expect(result.longitude).toBeLessThanOrEqual(104.0);
    });

    it("should return different coordinates on multiple calls", async () => {
      // Test multiple times to ensure randomness
      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await runServerEffectAsync(getRandomSingaporeCoords());
        results.push(result);
      }

      // Check that at least one pair is different
      let hasDifferent = false;
      for (let i = 0; i < results.length; i++) {
        for (let j = i + 1; j < results.length; j++) {
          const isDifferent =
            results[i].latitude !== results[j].latitude ||
            results[i].longitude !== results[j].longitude;
          if (isDifferent) {
            hasDifferent = true;
            break;
          }
        }
        if (hasDifferent) break;
      }

      expect(hasDifferent).toBe(true);
    });
  });

  describe("getStaticMap", () => {
    it("should return a valid map URL", async () => {
      const coords = { longitude: 103.8, latitude: 1.3 };
      const result = await runServerEffectAsync(
        getStaticMap(coords, 12, { width: 400, height: 300 }),
      );

      expect(result).toContain("api.mapbox.com");
      expect(result).toContain("103.8,1.3");
      expect(result).toContain("400x300");
      expect(result).toContain("access_token");
    });
  });
});
