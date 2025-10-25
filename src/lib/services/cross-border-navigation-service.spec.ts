import { Effect } from "effect";
import type mapboxgl from "mapbox-gl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CityDetectionError,
  CrossBorderNavigationError,
  CrossBorderNavigationServiceImpl,
  MapNotReadyError,
} from "./cross-border-navigation-service";

// Mock the detect-location module
vi.mock("../utils/detect-location", () => ({
  detectCityFromCoords: vi.fn(),
}));

import { detectCityFromCoords } from "../utils/detect-location";

describe("CrossBorderNavigationService", () => {
  let service: CrossBorderNavigationServiceImpl;
  let mockMap: Partial<mapboxgl.Map>;

  beforeEach(() => {
    service = new CrossBorderNavigationServiceImpl();

    // Create mock map instance
    mockMap = {
      isStyleLoaded: vi.fn().mockReturnValue(true),
      stop: vi.fn(),
      flyTo: vi.fn(),
    };

    // Reset all mocks
    vi.clearAllMocks();

    // Mock window.history
    global.window = {
      history: {
        replaceState: vi.fn(),
      },
    } as any;

    // Mock requestAnimationFrame (not available in Node.js)
    global.requestAnimationFrame = vi.fn((callback) => {
      callback(0);
      return 0;
    });
  });

  describe("detectCrossBorder", () => {
    it("should detect same city (Singapore to Singapore)", async () => {
      vi.mocked(detectCityFromCoords).mockResolvedValue("singapore");

      const result = await Effect.runPromise(
        service.detectCrossBorder(
          { latitude: 1.3521, longitude: 103.8198 },
          "singapore",
          "test-token",
        ),
      );

      expect(result.detectedCity).toBe("singapore");
      expect(result.isCrossBorder).toBe(false);
    });

    it("should detect cross-border (Singapore to Jakarta)", async () => {
      vi.mocked(detectCityFromCoords).mockResolvedValue("jakarta");

      const result = await Effect.runPromise(
        service.detectCrossBorder(
          { latitude: -6.2088, longitude: 106.8456 },
          "singapore",
          "test-token",
        ),
      );

      expect(result.detectedCity).toBe("jakarta");
      expect(result.isCrossBorder).toBe(true);
    });

    it("should detect cross-border (Jakarta to Singapore)", async () => {
      vi.mocked(detectCityFromCoords).mockResolvedValue("singapore");

      const result = await Effect.runPromise(
        service.detectCrossBorder(
          { latitude: 1.3521, longitude: 103.8198 },
          "jakarta",
          "test-token",
        ),
      );

      expect(result.detectedCity).toBe("singapore");
      expect(result.isCrossBorder).toBe(true);
    });

    it("should handle unknown city detection", async () => {
      vi.mocked(detectCityFromCoords).mockResolvedValue("unknown");

      const result = await Effect.runPromise(
        service.detectCrossBorder(
          { latitude: 0, longitude: 0 },
          "singapore",
          "test-token",
        ),
      );

      expect(result.detectedCity).toBe("unknown");
      expect(result.isCrossBorder).toBe(false);
    });

    it("should fail with CityDetectionError on API failure", async () => {
      vi.mocked(detectCityFromCoords).mockRejectedValue(new Error("API Error"));

      const effect = service.detectCrossBorder(
        { latitude: 1.3521, longitude: 103.8198 },
        "singapore",
        "test-token",
      );

      // Effect errors get wrapped in FiberFailure, check the error message
      await expect(Effect.runPromise(effect)).rejects.toThrow(
        /Failed to detect city from coordinates/,
      );
    });
  });

  describe("executeFlyTo", () => {
    it("should execute flyTo for local navigation", async () => {
      const coords = { latitude: 1.3521, longitude: 103.8198 };

      await Effect.runPromise(
        service.executeFlyTo(
          mockMap as mapboxgl.Map,
          coords,
          1800,
          false,
          false,
        ),
      );

      expect(mockMap.stop).toHaveBeenCalled();
      expect(mockMap.flyTo).toHaveBeenCalledWith(
        expect.objectContaining({
          center: [coords.longitude, coords.latitude],
          zoom: 16, // Desktop zoom
          duration: 1800,
          curve: 1.3, // Local curve
        }),
      );
    });

    it("should execute flyTo for cross-border navigation", async () => {
      const coords = { latitude: -6.2088, longitude: 106.8456 };

      await Effect.runPromise(
        service.executeFlyTo(
          mockMap as mapboxgl.Map,
          coords,
          6000,
          true,
          false,
        ),
      );

      expect(mockMap.stop).toHaveBeenCalled();
      expect(mockMap.flyTo).toHaveBeenCalledWith(
        expect.objectContaining({
          center: [coords.longitude, coords.latitude],
          zoom: 16, // Desktop zoom
          duration: 6000,
          curve: 1.8, // Cross-border curve
        }),
      );
    }, 10000); // 10 second timeout for 6 second animation

    it("should use mobile zoom when isMobile is true", async () => {
      const coords = { latitude: 1.3521, longitude: 103.8198 };

      await Effect.runPromise(
        service.executeFlyTo(
          mockMap as mapboxgl.Map,
          coords,
          1800,
          false,
          true,
        ),
      );

      expect(mockMap.flyTo).toHaveBeenCalledWith(
        expect.objectContaining({
          zoom: 15, // Mobile zoom
        }),
      );
    });

    it("should fail with MapNotReadyError if map is not loaded", async () => {
      mockMap.isStyleLoaded = vi.fn().mockReturnValue(false);

      const effect = service.executeFlyTo(
        mockMap as mapboxgl.Map,
        { latitude: 1.3521, longitude: 103.8198 },
        1800,
        false,
        false,
      );

      await expect(Effect.runPromise(effect)).rejects.toThrow(
        /Map is not ready for flyTo animation/,
      );
    });

    it("should fail with MapNotReadyError if map is null", async () => {
      const effect = service.executeFlyTo(
        null as any,
        { latitude: 1.3521, longitude: 103.8198 },
        1800,
        false,
        false,
      );

      await expect(Effect.runPromise(effect)).rejects.toThrow(
        /Map is not ready for flyTo animation/,
      );
    });
  });

  describe("updateUrlWithoutNavigation", () => {
    it("should update URL to Singapore", async () => {
      await Effect.runPromise(service.updateUrlWithoutNavigation("singapore"));

      expect(window.history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        "/singapore",
      );
    });

    it("should update URL to Jakarta", async () => {
      await Effect.runPromise(service.updateUrlWithoutNavigation("jakarta"));

      expect(window.history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        "/jakarta",
      );
    });

    it("should fail with CrossBorderNavigationError if history API fails", async () => {
      vi.mocked(window.history.replaceState).mockImplementation(() => {
        throw new Error("History API error");
      });

      const effect = service.updateUrlWithoutNavigation("singapore");

      await expect(Effect.runPromise(effect)).rejects.toThrow(
        /Failed to update URL to singapore/,
      );
    });
  });

  describe("handleLocationFound - Integration", () => {
    it("should handle local navigation (Singapore to Singapore)", async () => {
      vi.mocked(detectCityFromCoords).mockResolvedValue("singapore");

      const result = await Effect.runPromise(
        service.handleLocationFound({
          coordinates: { latitude: 1.3521, longitude: 103.8198 },
          currentCity: "singapore",
          map: mockMap as mapboxgl.Map,
          mapboxToken: "test-token",
          isMobile: false,
        }),
      );

      expect(result.detectedCity).toBe("singapore");
      expect(result.isCrossBorder).toBe(false);
      expect(result.flyToDuration).toBe(1800);
      expect(result.urlUpdated).toBe(false);
      expect(mockMap.flyTo).toHaveBeenCalled();
      expect(window.history.replaceState).not.toHaveBeenCalled();
    });

    it("should handle cross-border navigation (Singapore to Jakarta)", async () => {
      vi.mocked(detectCityFromCoords).mockResolvedValue("jakarta");

      const result = await Effect.runPromise(
        service.handleLocationFound({
          coordinates: { latitude: -6.2088, longitude: 106.8456 },
          currentCity: "singapore",
          map: mockMap as mapboxgl.Map,
          mapboxToken: "test-token",
          isMobile: false,
        }),
      );

      expect(result.detectedCity).toBe("jakarta");
      expect(result.isCrossBorder).toBe(true);
      expect(result.flyToDuration).toBe(6000);
      expect(result.urlUpdated).toBe(true);
      expect(mockMap.flyTo).toHaveBeenCalled();
      expect(window.history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        "/jakarta",
      );
    }, 10000); // 10 second timeout

    it("should handle cross-border navigation (Jakarta to Singapore)", async () => {
      vi.mocked(detectCityFromCoords).mockResolvedValue("singapore");

      const result = await Effect.runPromise(
        service.handleLocationFound({
          coordinates: { latitude: 1.3521, longitude: 103.8198 },
          currentCity: "jakarta",
          map: mockMap as mapboxgl.Map,
          mapboxToken: "test-token",
          isMobile: false,
        }),
      );

      expect(result.detectedCity).toBe("singapore");
      expect(result.isCrossBorder).toBe(true);
      expect(result.flyToDuration).toBe(6000);
      expect(result.urlUpdated).toBe(true);
      expect(window.history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        "/singapore",
      );
    }, 10000); // 10 second timeout

    it("should handle errors gracefully and propagate CityDetectionError", async () => {
      vi.mocked(detectCityFromCoords).mockRejectedValue(new Error("API Error"));

      const effect = service.handleLocationFound({
        coordinates: { latitude: 1.3521, longitude: 103.8198 },
        currentCity: "singapore",
        map: mockMap as mapboxgl.Map,
        mapboxToken: "test-token",
        isMobile: false,
      });

      await expect(Effect.runPromise(effect)).rejects.toThrow(
        /Failed to detect city from coordinates/,
      );
    });

    it("should handle MapNotReadyError gracefully", async () => {
      vi.mocked(detectCityFromCoords).mockResolvedValue("singapore");
      mockMap.isStyleLoaded = vi.fn().mockReturnValue(false);

      const effect = service.handleLocationFound({
        coordinates: { latitude: 1.3521, longitude: 103.8198 },
        currentCity: "singapore",
        map: mockMap as mapboxgl.Map,
        mapboxToken: "test-token",
        isMobile: false,
      });

      await expect(Effect.runPromise(effect)).rejects.toThrow(
        /Map is not ready for flyTo animation/,
      );
    });
  });
});
