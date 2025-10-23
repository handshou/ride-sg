# Runtime Architecture

## Overview

This project uses Effect-TS with Next.js instrumentation hooks to create **managed runtimes** for server and client contexts. This pattern provides:

- **One-time initialization** - Runtimes are created once at startup, not per-request
- **Proper lifecycle management** - Resources are managed with Effect's `ManagedRuntime`
- **Clear separation** - Server and client services are properly isolated
- **Shared base services** - Common services available to both contexts
- **Type safety** - Runtime types include all available services

## Architecture Pattern

We use a **three-tier architecture**:

```
BaseLayer (shared services)
    ↓
    ├── ServerLayer (server-only services)
    └── ClientLayer (client-only services)
```

### Service Distribution

#### Shared Services (BaseLayer)

Services that work in both server and client contexts:

1. **ConfigService** - Environment variable access
   - Rationale: Both server and client need config (with appropriate public/private separation)
   - Location: `src/lib/services/config-service.ts`

2. **ToastServiceLive** - Logging-based toast notifications
   - Rationale: Server logs, client can extend to display actual toasts
   - Location: `src/lib/services/toast-service.ts`

#### Server-Only Services (ServerLayer)

Services that require server-side execution:

1. **MapboxService** - Mapbox API with server-side token
   - Rationale: Uses secret `MAPBOX_ACCESS_TOKEN` for server-side geocoding
   - Location: `src/lib/services/mapbox-service.ts`

2. **RainfallService** - NEA Singapore Rainfall API
   - Rationale: Server-side API fetching with validation
   - Location: `src/lib/services/rainfall-service.ts`

3. **BicycleParkingService** - LTA DataMall API
   - Rationale: Requires server-side `LTA_ACCOUNT_KEY`
   - Location: `src/lib/services/bicycle-parking-service.ts`

4. **ExaSearchService** - Exa AI semantic search
   - Rationale: Requires secret `EXA_API_KEY`, never expose to client
   - Location: `src/lib/services/exa-search-service.ts`

5. **ConvexService** - Convex database operations (planned)
   - Rationale: Server-side database mutations and queries
   - Location: `src/lib/services/convex-service.ts`

6. **DatabaseSearchService** - Database search queries (planned)
   - Rationale: Server-side database access
   - Location: `src/lib/services/database-search-service.ts`

7. **RandomCoordinatesService** - Singapore coordinate generation
   - Rationale: Server-side utility, works fine on server
   - Location: `src/lib/services/random-coordinates-service.ts`

#### Client-Only Services (ClientLayer)

Services that require browser APIs or DOM:

1. **GeolocationService** - Browser Geolocation API
   - Rationale: Uses `navigator.geolocation` (browser-only)
   - Location: `src/lib/services/geolocation-service.ts`

2. **MapReadinessService** - Mapbox GL map readiness checks
   - Rationale: Requires DOM and Mapbox GL instance
   - Location: `src/lib/services/map-readiness-service.ts`

3. **ThemeSyncService** - Theme/map style synchronization
   - Rationale: Reads `window.matchMedia` for system theme
   - Location: `src/lib/services/theme-sync-service.ts`

4. **SearchStateService** - Client-side search state management
   - Rationale: Uses Effect `Ref` for reactive client state
   - Location: `src/lib/services/search-state-service.ts`

## Implementation Details

### Instrumentation Files

#### Server: `instrumentation.ts`

Located in the **root directory**, this file:
- Runs **once** when Next.js server starts
- Creates a `ManagedRuntime` with `ServerLayer`
- Exports `getServerRuntime()` for use throughout the app

```typescript
// instrumentation.ts
import { ManagedRuntime } from "effect";
import { ServerLayer } from "./src/lib/runtime/server-layer";

let serverRuntime: ManagedRuntime.ManagedRuntime<
  typeof ServerLayer.Success,
  never
> | undefined;

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (!serverRuntime) {
      serverRuntime = ManagedRuntime.make(ServerLayer);
      console.log("✅ Server runtime initialized");
    }
  }
}

export function getServerRuntime() {
  if (!serverRuntime) {
    throw new Error("Server runtime not initialized");
  }
  return serverRuntime;
}
```

#### Client: `instrumentation-client.ts`

Located in the **root directory**, this file:
- Runs **before** the app becomes interactive
- Creates a `ManagedRuntime` with `ClientLayer`
- Exports `getClientRuntime()` for client-side use

```typescript
// instrumentation-client.ts
import { ManagedRuntime } from "effect";
import { ClientLayer } from "./src/lib/runtime/client-layer";

const clientRuntime = ManagedRuntime.make(ClientLayer);
console.log("✅ Client runtime initialized");

export function getClientRuntime() {
  return clientRuntime;
}
```

### Layer Structure

#### BaseLayer (`src/lib/runtime/base-layer.ts`)

Combines shared services:

```typescript
import { Layer } from "effect";
import { ConfigService } from "../services/config-service";
import { ToastServiceLive } from "../services/toast-service";

export const BaseLayer = Layer.mergeAll(
  ConfigService.Default,
  ToastServiceLive
);
```

#### ServerLayer (`src/lib/runtime/server-layer.ts`)

Extends `BaseLayer` with server-specific services:

```typescript
import { Layer } from "effect";
import { BaseLayer } from "./base-layer";
import { MapboxService } from "../services/mapbox-service";
import { RainfallService } from "../services/rainfall-service";
import { BicycleParkingService } from "../services/bicycle-parking-service";
import { ExaSearchService } from "../services/exa-search-service";
// ... other server services

export const ServerLayer = Layer.mergeAll(
  BaseLayer,
  MapboxService.Default,
  RainfallService.Default,
  BicycleParkingService.Default,
  ExaSearchService.Default
  // ... other server services
).pipe(Layer.provide(ConfigService.Default));
```

#### ClientLayer (`src/lib/runtime/client-layer.ts`)

Extends `BaseLayer` with client-specific services:

```typescript
import { Layer } from "effect";
import { BaseLayer } from "./base-layer";
import { GeolocationServiceLive } from "../services/geolocation-service";
import { MapReadinessServiceLive } from "../services/map-readiness-service";
import { ThemeSyncServiceLive } from "../services/theme-sync-service";
import { SearchStateServiceLive } from "../services/search-state-service";

export const ClientLayer = Layer.mergeAll(
  BaseLayer,
  GeolocationServiceLive,
  MapReadinessServiceLive,
  ThemeSyncServiceLive,
  SearchStateServiceLive
);
```

### Runtime Helpers

#### Server Runtime (`src/lib/server-runtime.ts`)

Provides helpers for server components and actions:

```typescript
import { Effect } from "effect";
import { getServerRuntime } from "../../instrumentation";

export function runServerEffect<A, E>(program: Effect.Effect<A, E, any>): A {
  const runtime = getServerRuntime();
  return runtime.runSync(program);
}

export async function runServerEffectAsync<A, E>(
  program: Effect.Effect<A, E, any>
): Promise<A> {
  const runtime = getServerRuntime();
  return runtime.runPromise(program);
}
```

#### Client Runtime (`src/lib/client-runtime.ts`)

Provides helpers for client components:

```typescript
import { Effect } from "effect";
import { getClientRuntime } from "../../instrumentation-client";

export function runClientEffect<A, E>(program: Effect.Effect<A, E, any>): A {
  const runtime = getClientRuntime();
  return runtime.runSync(program);
}

export async function runClientEffectAsync<A, E>(
  program: Effect.Effect<A, E, any>
): Promise<A> {
  const runtime = getClientRuntime();
  return runtime.runPromise(program);
}
```

## Usage Examples

### Server Component

```typescript
// src/app/page.tsx (Server Component)
import { Effect } from "effect";
import { runServerEffectAsync } from "@/lib/server-runtime";
import { MapboxService } from "@/lib/services/mapbox-service";

export default async function Page() {
  const data = await runServerEffectAsync(
    Effect.gen(function* () {
      const mapbox = yield* MapboxService;
      return yield* mapbox.forwardGeocode("Marina Bay, Singapore");
    })
  );
  
  return <div>{/* render data */}</div>;
}
```

### Server Action

```typescript
// src/lib/actions/search-actions.ts
"use server";
import { runServerEffectAsync } from "@/lib/server-runtime";
import { ExaSearchService } from "@/lib/services/exa-search-service";

export async function searchLocations(query: string) {
  return await runServerEffectAsync(
    Effect.gen(function* () {
      const exa = yield* ExaSearchService;
      return yield* exa.search(query);
    })
  );
}
```

### Client Component

```typescript
// src/components/locate-me-button.tsx (Client Component)
"use client";
import { runClientEffectAsync } from "@/lib/client-runtime";
import { GeolocationService } from "@/lib/services/geolocation-service";

export function LocateMeButton() {
  const handleClick = async () => {
    const position = await runClientEffectAsync(
      Effect.gen(function* () {
        const geo = yield* GeolocationService;
        return yield* geo.getCurrentPosition();
      })
    );
    console.log(position);
  };
  
  return <button onClick={handleClick}>Locate Me</button>;
}
```

## Benefits

### Performance

- **Reduced overhead**: Runtime created once, not per-request
- **Faster execution**: No repeated layer construction
- **Memory efficient**: Shared service instances

### Type Safety

- **Compile-time checking**: Service requirements enforced by types
- **Auto-completion**: IDE knows all available services
- **No manual provision**: Runtime provides services automatically

### Developer Experience

- **Clear separation**: No confusion about which services run where
- **Simple API**: Just use `runServerEffect` or `runClientEffect`
- **Centralized config**: All runtime setup in instrumentation files

### Maintainability

- **Single source of truth**: Layer definitions show all dependencies
- **Easy to extend**: Add new services to appropriate layer
- **Clear dependency graphs**: Service relationships are explicit

## Adding New Services

### Server-Only Service

1. Create service in `src/lib/services/my-service.ts`
2. Add to `ServerLayer` in `src/lib/runtime/server-layer.ts`:
   ```typescript
   export const ServerLayer = Layer.mergeAll(
     BaseLayer,
     // ... existing services
     MyService.Default
   );
   ```

### Client-Only Service

1. Create service in `src/lib/services/my-service.ts`
2. Add to `ClientLayer` in `src/lib/runtime/client-layer.ts`:
   ```typescript
   export const ClientLayer = Layer.mergeAll(
     BaseLayer,
     // ... existing services
     MyServiceLive
   );
   ```

### Shared Service

1. Create service in `src/lib/services/my-service.ts`
2. Add to `BaseLayer` in `src/lib/runtime/base-layer.ts`:
   ```typescript
   export const BaseLayer = Layer.mergeAll(
     // ... existing services
     MyServiceLive
   );
   ```

## Testing

Use `ManagedRuntime` in tests for proper service injection:

```typescript
import { describe, it, expect } from "vitest";
import { Effect, ManagedRuntime } from "effect";
import { ServerLayer } from "../runtime/server-layer";

describe("MyService", () => {
  const testRuntime = ManagedRuntime.make(ServerLayer);
  
  it("should work correctly", async () => {
    const result = await testRuntime.runPromise(
      Effect.gen(function* () {
        const service = yield* MyService;
        return yield* service.doSomething();
      })
    );
    
    expect(result).toBe(expected);
  });
});
```

## Migration Guide

### Before (Manual Layer Provision)

```typescript
const result = await Effect.runPromise(
  program.pipe(Effect.provide(ServerLayer))
);
```

### After (Managed Runtime)

```typescript
import { runServerEffectAsync } from "@/lib/server-runtime";

const result = await runServerEffectAsync(program);
```

No manual `Effect.provide` needed - the runtime handles it automatically!

## Next.js Configuration

Instrumentation is **stable** in Next.js 15+. For older versions, enable in `next.config.ts`:

```typescript
const config = {
  experimental: {
    instrumentationHook: true, // Only needed for Next.js < 15
  },
};
```

## References

- [Next.js Instrumentation Documentation](https://nextjs.org/docs/app/guides/instrumentation)
- [Effect-TS ManagedRuntime](https://effect.website/docs/runtime)
- [Mike Arnaldi's Runtime Patterns](https://github.com/mikearnaldi/next-effect)

