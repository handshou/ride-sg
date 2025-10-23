# Logging Best Practices in Ride-SG

## Overview

This document explains our logging strategy and best practices for the Effect-TS runtime architecture.

## Logging Levels

We use different logging approaches depending on the context:

### 1. **Instrumentation Files** (`instrumentation.ts`, `instrumentation-client.ts`)

**Use `console.log`** for lifecycle events:

```typescript
// ✅ Good: Simple lifecycle logging
serverRuntime = ManagedRuntime.make(ServerLayer);
console.log("✅ Server runtime initialized");

// ❌ Bad: Listing individual services
console.log("   - MapboxService: Ready");
console.log("   - RainfallService: Ready"); 
```

**Why?**
- Instrumentation runs BEFORE Effect runtime exists
- Need synchronous, simple logging
- Lifecycle events are critical for debugging startup issues

### 2. **Service Initialization** (Inside `Effect.Service`)

**Use `Effect.logDebug`** for service construction:

```typescript
export class MapboxService extends Effect.Service<MapboxService>()(
  "MapboxService",
  {
    effect: Effect.gen(function* () {
      const config = yield* ConfigService;
      yield* Effect.logDebug("📍 MapboxService initialized");
      return new MapboxServiceImpl(config);
    }),
  },
) {}
```

**Why?**
- Runs inside Effect context (runtime available)
- Provides structured logging with fiber IDs
- Can be filtered by log level (debug, info, error)
- Only logs when service is first accessed (lazy initialization)

### 3. **Layer Construction** (For `Layer.succeed` pattern)

**Use `Layer.tap`** for layer-based services:

```typescript
export const GeolocationServiceLive = Layer.succeed(
  GeolocationServiceTag,
  new GeolocationServiceImpl(),
).pipe(
  Layer.tap(() => Effect.logDebug("📍 GeolocationService initialized")),
);
```

**Why?**
- Works with non-Effect.Service patterns
- Keeps layer definition clean
- Consistent with Effect patterns

### 4. **Business Logic** (Runtime operations)

**Use Effect.log variants** for operational logging:

```typescript
// Info level
yield* Effect.logInfo(`Starting search for: "${query}"`);

// Warning level
yield* Effect.logWarning("Convex not configured, using mock data");

// Error level
yield* Effect.logError("Search failed:", error);

// Debug level
yield* Effect.logDebug("Cache hit for key:", cacheKey);
```

**Why?**
- Structured logging with context (fiber ID, timestamp)
- Can be filtered and aggregated
- Works with Effect error handling
- Integrates with observability tools

## Separation of Concerns

### ❌ **Bad: Tight Coupling**

```typescript
// instrumentation.ts
console.log("   - MapboxService: Geocoding ready");
console.log("   - RainfallService: API client ready");
// Problem: Instrumentation knows about service details
```

### ✅ **Good: Loose Coupling**

```typescript
// instrumentation.ts
console.log("✅ Server runtime initialized");

// mapbox-service.ts
yield* Effect.logDebug("📍 MapboxService initialized");

// rainfall-service.ts
yield* Effect.logDebug("🌧️ RainfallService initialized");
```

**Benefits:**
- Services are self-documenting
- Instrumentation stays minimal
- Easy to add/remove services
- Better maintainability

## When Services Log

### Effect.Service Pattern
Services using `Effect.Service` log when **first accessed** (lazy initialization):

```typescript
// Runtime created (no logs yet)
const runtime = ManagedRuntime.make(ServerLayer);

// Service accessed (NOW it logs)
const result = await runtime.runPromise(
  Effect.gen(function* () {
    const mapbox = yield* MapboxService; // 📍 MapboxService initialized
    return yield* mapbox.forwardGeocode("Singapore");
  })
);
```

### Layer.succeed Pattern
Services using `Layer.succeed` log when **layer is built** (eager initialization):

```typescript
// Logs immediately during layer construction
const ClientLayer = Layer.mergeAll(
  BaseLayer,
  GeolocationServiceLive, // 📍 GeolocationService initialized (now)
  MapReadinessServiceLive, // 🗺️ MapReadinessService initialized (now)
);
```

## Log Levels in Production

### Development
```typescript
// All levels visible
Effect.logDebug("...") // ✅ Visible
Effect.logInfo("...")  // ✅ Visible
Effect.logWarning("...") // ✅ Visible
Effect.logError("...") // ✅ Visible
```

### Production
Configure Effect logger to filter by level:

```typescript
// Only info, warning, error
Effect.logDebug("...") // ❌ Filtered out
Effect.logInfo("...")  // ✅ Visible
Effect.logWarning("...") // ✅ Visible
Effect.logError("...") // ✅ Visible
```

## Emoji Convention

Use emojis for quick visual identification:

- `⚙️` ConfigService
- `📢` ToastService
- `📍` MapboxService / GeolocationService
- `🌧️` RainfallService
- `🚲` BicycleParkingService
- `🗺️` MapReadinessService
- `🎨` ThemeSyncService
- `✅` Success / Initialization complete
- `⚠️` Warning
- `❌` Error

## Example: Full Stack

```typescript
// 1. Server starts
// instrumentation.ts (console.log)
✅ Server runtime initialized

// 2. First request arrives
// Effect.logDebug (lazy services initialize)
timestamp=2025-10-23T15:44:24.524Z level=DEBUG fiber=#0 message="⚙️ ConfigService loading environment variables..."
timestamp=2025-10-23T15:44:24.525Z level=DEBUG fiber=#0 message="📍 MapboxService initialized"

// 3. Business logic executes
// Effect.logInfo (operational logging)
timestamp=2025-10-23T15:44:24.526Z level=INFO fiber=#1 message="Starting search for: \"marina\""
timestamp=2025-10-23T15:44:24.530Z level=INFO fiber=#1 message="Search completed: 5 results"
```

## Summary

| Context | Tool | When | Example |
|---------|------|------|---------|
| Instrumentation | `console.log` | Runtime lifecycle | `console.log("✅ Server runtime initialized")` |
| Service (Effect.Service) | `Effect.logDebug` | First access | `yield* Effect.logDebug("📍 MapboxService initialized")` |
| Service (Layer.succeed) | `Layer.tap` | Layer build | `Layer.tap(() => Effect.logDebug("..."))` |
| Business Logic | `Effect.log*` | Operations | `yield* Effect.logInfo("Starting search...")` |

**Golden Rule:** Let services document themselves, keep instrumentation minimal! 🎯

