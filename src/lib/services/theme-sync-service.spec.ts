import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
  getDefaultStateEffect,
  getMapStyleForThemeEffect,
  getThemeForMapStyleEffect,
  syncThemeAndMapStyleEffect,
  ThemeSyncServiceLive,
} from "./theme-sync-service";

describe("ThemeSyncService", () => {
  describe("getDefaultState", () => {
    it("should return time-based theme (light 6AM-6PM, dark otherwise)", async () => {
      const result = await Effect.runPromise(
        getDefaultStateEffect().pipe(Effect.provide(ThemeSyncServiceLive)),
      );

      // Check that both theme and mapStyle are consistent
      expect(result.theme).toMatch(/^(light|dark)$/);
      expect(result.mapStyle).toBe(result.theme);

      // Verify time-based logic: light during 6AM-6PM, dark otherwise
      const hour = new Date().getHours();
      const expectedTheme = hour >= 6 && hour < 18 ? "light" : "dark";

      expect(result).toEqual({
        theme: expectedTheme,
        mapStyle: expectedTheme,
      });
    });
  });

  describe("getThemeForMapStyle", () => {
    it("should return dark theme for dark map style", async () => {
      const result = await Effect.runPromise(
        getThemeForMapStyleEffect("dark").pipe(
          Effect.provide(ThemeSyncServiceLive),
        ),
      );

      expect(result).toBe("dark");
    });

    it("should return light theme for light map style", async () => {
      const result = await Effect.runPromise(
        getThemeForMapStyleEffect("light").pipe(
          Effect.provide(ThemeSyncServiceLive),
        ),
      );

      expect(result).toBe("light");
    });

    it("should return light theme for satellite map style", async () => {
      const result = await Effect.runPromise(
        getThemeForMapStyleEffect("satellite").pipe(
          Effect.provide(ThemeSyncServiceLive),
        ),
      );

      expect(result).toBe("light");
    });

    it("should return light theme for outdoors map style", async () => {
      const result = await Effect.runPromise(
        getThemeForMapStyleEffect("outdoors").pipe(
          Effect.provide(ThemeSyncServiceLive),
        ),
      );

      expect(result).toBe("light");
    });
  });

  describe("getMapStyleForTheme", () => {
    it("should return dark map style for dark theme", async () => {
      const result = await Effect.runPromise(
        getMapStyleForThemeEffect("dark").pipe(
          Effect.provide(ThemeSyncServiceLive),
        ),
      );

      expect(result).toBe("dark");
    });

    it("should return light map style for light theme", async () => {
      const result = await Effect.runPromise(
        getMapStyleForThemeEffect("light").pipe(
          Effect.provide(ThemeSyncServiceLive),
        ),
      );

      expect(result).toBe("light");
    });

    it("should return dark map style for system theme when no window available", async () => {
      const result = await Effect.runPromise(
        getMapStyleForThemeEffect("system").pipe(
          Effect.provide(ThemeSyncServiceLive),
        ),
      );

      // In Node test environment, window is not available, so defaults to dark
      expect(result).toBe("dark");
    });
  });

  describe("syncThemeAndMapStyle", () => {
    it("should return both when both provided", async () => {
      const result = await Effect.runPromise(
        syncThemeAndMapStyleEffect({
          theme: "light",
          mapStyle: "satellite",
        }).pipe(Effect.provide(ThemeSyncServiceLive)),
      );

      expect(result).toEqual({
        theme: "light",
        mapStyle: "satellite",
      });
    });

    it("should derive map style when only theme provided", async () => {
      const result = await Effect.runPromise(
        syncThemeAndMapStyleEffect({ theme: "dark" }).pipe(
          Effect.provide(ThemeSyncServiceLive),
        ),
      );

      expect(result).toEqual({
        theme: "dark",
        mapStyle: "dark",
      });
    });

    it("should derive theme when only map style provided", async () => {
      const result = await Effect.runPromise(
        syncThemeAndMapStyleEffect({ mapStyle: "satellite" }).pipe(
          Effect.provide(ThemeSyncServiceLive),
        ),
      );

      expect(result).toEqual({
        theme: "light",
        mapStyle: "satellite",
      });
    });

    it("should return time-based defaults when neither provided", async () => {
      const result = await Effect.runPromise(
        syncThemeAndMapStyleEffect({}).pipe(
          Effect.provide(ThemeSyncServiceLive),
        ),
      );

      // Check that both theme and mapStyle are consistent
      expect(result.theme).toMatch(/^(light|dark)$/);
      expect(result.mapStyle).toBe(result.theme);

      // Verify time-based logic: light during 6AM-6PM, dark otherwise
      const hour = new Date().getHours();
      const expectedTheme = hour >= 6 && hour < 18 ? "light" : "dark";

      expect(result).toEqual({
        theme: expectedTheme,
        mapStyle: expectedTheme,
      });
    });
  });
});
