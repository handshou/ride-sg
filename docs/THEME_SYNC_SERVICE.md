# Theme Sync Service

## Overview

The **Theme Sync Service** is an Effect-TS service that coordinates synchronization between the UI theme (light/dark/system) and the Mapbox map layer style (light/dark/satellite/outdoors). It ensures both stay in sync when either changes.

## Problem Statement

Before this service, we had the following issues:
- **UI Theme** defaulted to `light` (in `layout.tsx`)
- **Map Layer** defaulted to `dark` (in `singapore-map-explorer.tsx`)
- This created a mismatch on initial load where the UI was light but the map was dark
- Changing the map layer would sync the theme, but direct theme changes wouldn't sync the map

## Solution

The Theme Sync Service provides:
1. **Centralized coordination** between theme and map style
2. **Consistent defaults** (both dark)
3. **Bidirectional sync** (theme → map style, or map style → theme)
4. **Type-safe Effect-TS API**

## Architecture

```typescript
// Service Interface
interface IThemeSyncService {
  getThemeForMapStyle(mapStyle: MapStyleMode): Effect.Effect<ThemeMode, never>;
  getMapStyleForTheme(theme: ThemeMode): Effect.Effect<MapStyleMode, never>;
  syncThemeAndMapStyle(input: {
    theme?: ThemeMode;
    mapStyle?: MapStyleMode;
  }): Effect.Effect<ThemeSyncState, never>;
  getDefaultState(): Effect.Effect<ThemeSyncState, never>;
}
```

## Type Definitions

```typescript
type ThemeMode = "light" | "dark" | "system";
type MapStyleMode = "light" | "dark" | "satellite" | "outdoors";

interface ThemeSyncState {
  theme: ThemeMode;
  mapStyle: MapStyleMode;
}
```

## Sync Rules

### Map Style → Theme
- **Dark map** → **Dark theme**
- **Light map** → **Light theme**
- **Satellite map** → **Light theme** (for better readability)
- **Outdoors map** → **Light theme** (for better readability)

### Theme → Map Style
- **Dark theme** → **Dark map**
- **Light theme** → **Light map**
- **System theme** → Detect from `window.matchMedia('(prefers-color-scheme: dark)')`

## Usage

### 1. Get Default State

```typescript
import { Effect } from "effect";
import {
  ThemeSyncServiceLive,
  getDefaultStateEffect,
} from "@/lib/services/theme-sync-service";

// Get default state (both dark)
const defaultState = await Effect.runPromise(
  getDefaultStateEffect().pipe(Effect.provide(ThemeSyncServiceLive))
);

console.log(defaultState); // { theme: "dark", mapStyle: "dark" }
```

### 2. Derive Theme from Map Style

```typescript
import {
  getThemeForMapStyleEffect,
  ThemeSyncServiceLive,
} from "@/lib/services/theme-sync-service";

// User changes map to satellite
const theme = await Effect.runPromise(
  getThemeForMapStyleEffect("satellite").pipe(
    Effect.provide(ThemeSyncServiceLive)
  )
);

console.log(theme); // "light" (satellite maps are better with light theme)
```

### 3. Derive Map Style from Theme

```typescript
import {
  getMapStyleForThemeEffect,
  ThemeSyncServiceLive,
} from "@/lib/services/theme-sync-service";

// User changes theme to dark
const mapStyle = await Effect.runPromise(
  getMapStyleForThemeEffect("dark").pipe(
    Effect.provide(ThemeSyncServiceLive)
  )
);

console.log(mapStyle); // "dark" (theme is dark, so map should be dark)
```

### 4. Sync Theme and Map Style Together

```typescript
import {
  syncThemeAndMapStyleEffect,
  ThemeSyncServiceLive,
} from "@/lib/services/theme-sync-service";

// Example 1: User changes map style, derive theme
const result1 = await Effect.runPromise(
  syncThemeAndMapStyleEffect({ mapStyle: "dark" }).pipe(
    Effect.provide(ThemeSyncServiceLive)
  )
);
console.log(result1); // { theme: "dark", mapStyle: "dark" }

// Example 2: User changes theme, derive map style
const result2 = await Effect.runPromise(
  syncThemeAndMapStyleEffect({ theme: "light" }).pipe(
    Effect.provide(ThemeSyncServiceLive)
  )
);
console.log(result2); // { theme: "light", mapStyle: "light" }

// Example 3: Initialize with defaults
const result3 = await Effect.runPromise(
  syncThemeAndMapStyleEffect({}).pipe(
    Effect.provide(ThemeSyncServiceLive)
  )
);
console.log(result3); // { theme: "dark", mapStyle: "dark" }
```

## Integration Points

### 1. Layout (Default Theme)

**File:** `src/app/layout.tsx`

```typescript
<ThemeProvider
  attribute="class"
  defaultTheme="dark" // ✅ Changed from "light" to "dark"
  disableTransitionOnChange
>
```

### 2. Map Style Selector ✅ INTEGRATED

**File:** `src/components/map-style-selector.tsx`

The map style selector now uses the Theme Sync Service:

```typescript
import { Effect } from "effect";
import {
  type MapStyleMode,
  ThemeSyncServiceLive,
  getThemeForMapStyleEffect,
} from "@/lib/services/theme-sync-service";
import { logger } from "@/lib/client-logger";

// Helper function to map MapStyle to MapStyleMode
function mapStyleToMapStyleMode(style: MapStyle): MapStyleMode {
  switch (style) {
    case "light":
      return "light";
    case "dark":
      return "dark";
    case "satellite":
    case "satelliteStreets":
      return "satellite";
    case "outdoors":
      return "outdoors";
    default:
      return "dark";
  }
}

const handleStyleChange = async (style: MapStyle) => {
  setCurrentStyle(style);
  const mapStyle = getMapStyleForStyle(style);
  onStyleChange(mapStyle);

  // Use Theme Sync Service to determine the correct theme
  try {
    const mapStyleMode = mapStyleToMapStyleMode(style);
    const theme = await Effect.runPromise(
      getThemeForMapStyleEffect(mapStyleMode).pipe(
        Effect.provide(ThemeSyncServiceLive),
      ),
    );
    setTheme(theme);
    logger.info(`Map style changed to ${style}, theme synced to ${theme}`);
  } catch (error) {
    logger.error("Failed to sync theme with map style:", error);
    // Fallback to manual theme selection
    if (style === "dark") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  }
};
```

**Features:**
- ✅ Automatic theme synchronization when map style changes
- ✅ Handles `satelliteStreets` style (maps to `satellite` for theme purposes)
- ✅ Error handling with fallback
- ✅ Logging for debugging

### 3. Theme Toggle

**File:** `src/components/theme-toggle.tsx`

The theme toggle can be enhanced to also update the map style:

```typescript
import { Effect } from "effect";
import {
  getMapStyleForThemeEffect,
  ThemeSyncServiceLive,
} from "@/lib/services/theme-sync-service";

const handleThemeChange = async (newTheme: ThemeMode) => {
  setTheme(newTheme);

  // Sync map style with theme
  const mapStyle = await Effect.runPromise(
    getMapStyleForThemeEffect(newTheme).pipe(
      Effect.provide(ThemeSyncServiceLive)
    )
  );

  // Update map style via callback
  onMapStyleChange(mapStyle);
};
```

## Testing

The service includes comprehensive tests:

```bash
pnpm test theme-sync-service
```

Test coverage:
- ✅ Default state returns both dark
- ✅ Theme derivation from map style
- ✅ Map style derivation from theme
- ✅ Bidirectional sync
- ✅ System theme detection

## Benefits

1. **Consistency**: Theme and map style always match
2. **Type Safety**: Effect-TS ensures type-safe operations
3. **Testability**: Pure functions, easy to test
4. **Maintainability**: Centralized sync logic
5. **Extensibility**: Easy to add new themes or map styles

## Future Enhancements

- [ ] Add `MapSyncService` for coordinating map-related settings
- [ ] Add React hooks for easier integration (`useThemeSync()`)
- [ ] Add localStorage persistence for user preferences
- [ ] Add system theme detection for automatic switching
- [ ] Add smooth transitions when syncing theme and map style

## Integration Status

| Component | Status | Notes |
|-----------|--------|-------|
| Layout | ✅ Integrated | Default theme set to `dark` |
| Map Style Selector | ✅ Integrated | Uses `getThemeForMapStyleEffect()` |
| Theme Toggle | ⏭️ Skipped | Hidden in current UI |
| Singapore Map Explorer | ✅ Ready | Uses `dark` as default map style |

## Related Files

- `src/lib/services/theme-sync-service.ts` - Service implementation
- `src/lib/services/theme-sync-service.spec.ts` - Service tests (12 tests)
- `src/app/layout.tsx` - Default theme configuration ✅
- `src/components/map-style-selector.tsx` - Map style selection ✅
- `src/components/theme-toggle.tsx` - Theme toggle (hidden)
- `src/components/singapore-map-explorer.tsx` - Map component
- `tests/e2e/interactive.spec.ts` - E2E tests (theme and map style interactions)

