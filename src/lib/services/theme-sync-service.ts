import { Context, Effect, Layer } from "effect";

/**
 * Theme Sync Service
 *
 * Coordinates synchronization between:
 * - UI Theme (light/dark/system)
 * - Map Style (light/dark/satellite)
 *
 * Ensures both stay in sync when either changes.
 */

export type ThemeMode = "light" | "dark" | "system";
export type MapStyleMode = "light" | "dark" | "satellite" | "outdoors";

export interface ThemeSyncState {
  theme: ThemeMode;
  mapStyle: MapStyleMode;
}

/**
 * Theme Sync Service Interface
 */
export interface IThemeSyncService {
  /**
   * Get the recommended theme based on map style
   */
  getThemeForMapStyle: (
    mapStyle: MapStyleMode,
  ) => Effect.Effect<ThemeMode, never>;

  /**
   * Get the recommended map style based on theme
   */
  getMapStyleForTheme: (theme: ThemeMode) => Effect.Effect<MapStyleMode, never>;

  /**
   * Sync theme and map style together
   * Returns both the theme and map style to use
   */
  syncThemeAndMapStyle: (input: {
    theme?: ThemeMode;
    mapStyle?: MapStyleMode;
  }) => Effect.Effect<ThemeSyncState, never>;

  /**
   * Get default state (both dark)
   */
  getDefaultState: () => Effect.Effect<ThemeSyncState, never>;
}

/**
 * Implementation of Theme Sync Service
 */
class ThemeSyncServiceImpl implements IThemeSyncService {
  getThemeForMapStyle(mapStyle: MapStyleMode): Effect.Effect<ThemeMode, never> {
    return Effect.sync(() => {
      // Dark map → Dark theme
      // Light map → Light theme
      // Satellite/Outdoors → Light theme (for better readability)
      switch (mapStyle) {
        case "dark":
          return "dark";
        case "light":
        case "satellite":
        case "outdoors":
          return "light";
        default:
          return "dark"; // Default to dark
      }
    });
  }

  getMapStyleForTheme(theme: ThemeMode): Effect.Effect<MapStyleMode, never> {
    return Effect.sync(() => {
      // Dark theme → Dark map
      // Light theme → Light map
      // System theme → Detect from system
      switch (theme) {
        case "dark":
          return "dark";
        case "light":
          return "light";
        case "system": {
          // Check system preference
          if (typeof window !== "undefined") {
            const prefersDark = window.matchMedia(
              "(prefers-color-scheme: dark)",
            ).matches;
            return prefersDark ? "dark" : "light";
          }
          return "dark"; // Default to dark if window not available
        }
        default:
          return "dark";
      }
    });
  }

  syncThemeAndMapStyle(input: {
    theme?: ThemeMode;
    mapStyle?: MapStyleMode;
  }): Effect.Effect<ThemeSyncState, never> {
    return Effect.sync(() => {
      // If both provided, use them as-is
      if (input.theme && input.mapStyle) {
        return { theme: input.theme, mapStyle: input.mapStyle };
      }

      // If only theme provided, derive map style
      if (input.theme && !input.mapStyle) {
        const mapStyle = this.getMapStyleForThemeSync(input.theme);
        return { theme: input.theme, mapStyle };
      }

      // If only map style provided, derive theme
      if (input.mapStyle && !input.theme) {
        const theme = this.getThemeForMapStyleSync(input.mapStyle);
        return { theme, mapStyle: input.mapStyle };
      }

      // If neither provided, return time-based default
      const now = new Date();
      const hour = now.getHours();
      const isDaytime = hour >= 6 && hour < 18;
      return {
        theme: isDaytime ? ("light" as ThemeMode) : ("dark" as ThemeMode),
        mapStyle: isDaytime
          ? ("light" as MapStyleMode)
          : ("dark" as MapStyleMode),
      };
    });
  }

  private getThemeForMapStyleSync(mapStyle: MapStyleMode): ThemeMode {
    switch (mapStyle) {
      case "dark":
        return "dark";
      case "light":
      case "satellite":
      case "outdoors":
        return "light";
      default:
        return "dark";
    }
  }

  private getMapStyleForThemeSync(theme: ThemeMode): MapStyleMode {
    switch (theme) {
      case "dark":
        return "dark";
      case "light":
        return "light";
      case "system": {
        if (typeof window !== "undefined") {
          const prefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)",
          ).matches;
          return prefersDark ? "dark" : "light";
        }
        return "dark";
      }
      default:
        return "dark";
    }
  }

  getDefaultState(): Effect.Effect<ThemeSyncState, never> {
    return Effect.gen(function* () {
      // Auto-detect theme based on time (6 AM - 6 PM = light, else dark)
      const now = new Date();
      const hour = now.getHours();
      const isDaytime = hour >= 6 && hour < 18;
      const theme = isDaytime ? ("light" as ThemeMode) : ("dark" as ThemeMode);
      const mapStyle = isDaytime
        ? ("light" as MapStyleMode)
        : ("dark" as MapStyleMode);

      yield* Effect.logDebug(
        `🎨 Time-based theme: ${theme} (hour: ${hour}, isDaytime: ${isDaytime})`,
      );

      return { theme, mapStyle };
    });
  }
}

/**
 * Theme Sync Service Tag
 */
export class ThemeSyncService extends Context.Tag("ThemeSyncService")<
  ThemeSyncService,
  IThemeSyncService
>() {}

/**
 * Live implementation layer
 */
export const ThemeSyncServiceLive = Layer.succeed(
  ThemeSyncService,
  new ThemeSyncServiceImpl(),
).pipe(Layer.tap(() => Effect.logDebug("🎨 ThemeSyncService initialized")));

/**
 * Convenience functions for use in React components
 */

export const getThemeForMapStyleEffect = (mapStyle: MapStyleMode) =>
  Effect.gen(function* () {
    const service = yield* ThemeSyncService;
    return yield* service.getThemeForMapStyle(mapStyle);
  });

export const getMapStyleForThemeEffect = (theme: ThemeMode) =>
  Effect.gen(function* () {
    const service = yield* ThemeSyncService;
    return yield* service.getMapStyleForTheme(theme);
  });

export const syncThemeAndMapStyleEffect = (input: {
  theme?: ThemeMode;
  mapStyle?: MapStyleMode;
}) =>
  Effect.gen(function* () {
    const service = yield* ThemeSyncService;
    return yield* service.syncThemeAndMapStyle(input);
  });

export const getDefaultStateEffect = () =>
  Effect.gen(function* () {
    const service = yield* ThemeSyncService;
    return yield* service.getDefaultState();
  });

/**
 * Sync helper - get time-based theme without Effect wrapper
 * Returns "light" for daytime (6 AM - 6 PM), "dark" otherwise
 *
 * Note: For logging, use this from React components with client logger.
 * For Effect-based code, use getDefaultStateEffect() which includes Effect.logDebug.
 */
export function getTimeBasedTheme(): "light" | "dark" {
  const now = new Date();
  const hour = now.getHours();
  const isDaytime = hour >= 6 && hour < 18;
  return isDaytime ? "light" : "dark";
}

/**
 * Sync helper - get time-based map style without Effect wrapper
 * Returns "light" for daytime (6 AM - 6 PM), "dark" otherwise
 *
 * This keeps map style in sync with theme based on time of day.
 */
export function getTimeBasedMapStyle(): "light" | "dark" {
  const now = new Date();
  const hour = now.getHours();
  const isDaytime = hour >= 6 && hour < 18;
  return isDaytime ? "light" : "dark";
}
