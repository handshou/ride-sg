# Effect Service Testing Patterns

This document describes the testing patterns used for Effect services in this codebase.

## Table of Contents

- [Overview](#overview)
- [Layer.mock Pattern](#layermock-pattern)
- [Available Test Layers](#available-test-layers)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Creating New Test Layers](#creating-new-test-layers)

## Overview

We use Effect's `Layer.mock` to create test implementations of services. This approach provides:

- ✅ **Type-safe mocking** - Full TypeScript support with proper type inference
- ✅ **Partial implementations** - Only implement what you need for each test
- ✅ **Automatic error handling** - Unimplemented methods throw `UnimplementedError`
- ✅ **Co-located with source** - Test layers live alongside production layers
- ✅ **Reusable** - Import and use across multiple test files
- ✅ **Composable** - Easy to override specific methods for custom scenarios

## Layer.mock Pattern

Effect's `Layer.mock` creates a layer with partial implementations. Any methods not provided will throw an error when called.

### Basic Example

```typescript
import { Layer } from "effect";

// Create a mock layer
const MyServiceTest = Layer.mock(MyService, {
  methodOne: () => Effect.succeed("mocked value"),
  methodTwo: () => Effect.void,
  // methodThree not implemented - will throw if called
});

// Use in tests
const program = Effect.gen(function* () {
  const service = yield* MyService;
  return yield* service.methodOne();
});

const result = await Effect.runPromise(
  program.pipe(Effect.provide(MyServiceTest))
);
```

## Available Test Layers

### MapNavigationServiceTest

**Location:** `src/lib/services/map-navigation-service.ts`

Mock implementation of `MapNavigationService` that provides no-op implementations for all navigation methods.

```typescript
import { MapNavigationServiceTest } from "@/lib/services/map-navigation-service";

// All methods return Effect.void (successful no-op)
const program = Effect.gen(function* () {
  const mapNav = yield* MapNavigationService;
  yield* mapNav.flyTo(map, { coordinates: { ... } });
  // No actual navigation occurs
});
```

**Methods:**
- `flyTo()` → `Effect.void`
- `flyToSearchResult()` → `Effect.void`
- `flyToParking()` → `Effect.void`
- `flyToRandomLocation()` → `Effect.void`

### CrossBorderNavigationServiceTest

**Location:** `src/lib/services/cross-border-navigation-service.ts`

Mock implementation of `CrossBorderNavigationService` with sensible default return values.

```typescript
import { CrossBorderNavigationServiceTest } from "@/lib/services/cross-border-navigation-service";

const program = Effect.gen(function* () {
  const service = yield* CrossBorderNavigationServiceTag;
  const result = yield* service.handleLocationFound({ ... });
  // Returns default mock data:
  // { detectedCity: "singapore", isCrossBorder: false, ... }
});
```

**Methods with Defaults:**
- `handleLocationFound()` → Returns mock navigation result (no cross-border)
- `detectCrossBorder()` → Returns Singapore, not cross-border
- `executeFlyTo()` → `Effect.void`
- `updateUrlWithoutNavigation()` → `Effect.void`

## Usage Examples

### Basic Unit Test (Direct Implementation)

Use the implementation class directly when testing business logic in isolation:

```typescript
import { CrossBorderNavigationServiceImpl } from "./cross-border-navigation-service";

describe("CrossBorderNavigationService", () => {
  let service: CrossBorderNavigationServiceImpl;
  let mockMapNav: any;

  beforeEach(() => {
    mockMapNav = {
      flyTo: vi.fn().mockReturnValue(Effect.void),
    };
    service = new CrossBorderNavigationServiceImpl(mockMapNav);
  });

  it("should detect same city", async () => {
    const result = await Effect.runPromise(
      service.detectCrossBorder(coords, "singapore", "token")
    );

    expect(result.isCrossBorder).toBe(false);
  });
});
```

### Integration Test (Using Test Layers)

Use test layers when testing through Effect's layer system:

```typescript
import { CrossBorderNavigationServiceTest } from "./cross-border-navigation-service";

describe("Integration Tests", () => {
  it("should work through Effect layer system", async () => {
    const program = Effect.gen(function* () {
      const service = yield* CrossBorderNavigationServiceTag;
      return yield* service.handleLocationFound({
        coordinates: { latitude: 1.3521, longitude: 103.8198 },
        currentCity: "singapore",
        map: mockMap,
        mapboxToken: "test-token",
        isMobile: false,
      });
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(CrossBorderNavigationServiceTest))
    );

    expect(result.detectedCity).toBe("singapore");
    expect(result.isCrossBorder).toBe(false);
  });
});
```

### Custom Mock Override

Override specific methods when you need custom behavior:

```typescript
import { Layer } from "effect";
import { CrossBorderNavigationServiceTag } from "./cross-border-navigation-service";

describe("Custom behavior tests", () => {
  it("should handle custom cross-border scenario", async () => {
    // Create a custom mock with specific behavior
    const CustomTestLayer = Layer.mock(CrossBorderNavigationServiceTag, {
      handleLocationFound: () =>
        Effect.succeed({
          detectedCity: "jakarta" as const,
          isCrossBorder: true,
          flyToDuration: 6000,
          urlUpdated: true,
        }),
    });

    const program = Effect.gen(function* () {
      const service = yield* CrossBorderNavigationServiceTag;
      return yield* service.handleLocationFound({ ... });
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(CustomTestLayer))
    );

    expect(result.isCrossBorder).toBe(true);
    expect(result.detectedCity).toBe("jakarta");
  });
});
```

### Testing with Multiple Services

When your code uses multiple services, compose the test layers:

```typescript
import { Layer } from "effect";
import { MapNavigationServiceTest } from "./map-navigation-service";
import { CrossBorderNavigationServiceTest } from "./cross-border-navigation-service";

const TestLayer = Layer.mergeAll(
  MapNavigationServiceTest,
  CrossBorderNavigationServiceTest,
  // Add other test layers as needed
);

const program = Effect.gen(function* () {
  // Use both services
  const mapNav = yield* MapNavigationService;
  const crossBorder = yield* CrossBorderNavigationServiceTag;
  // ...
});

await Effect.runPromise(
  program.pipe(Effect.provide(TestLayer))
);
```

## Best Practices

### 1. Use Test Layers for Integration Tests

Test layers are ideal when testing code that uses services through Effect's dependency injection:

```typescript
// ✅ Good - Testing through DI system
const program = Effect.gen(function* () {
  const service = yield* MyService;
  return yield* service.doSomething();
});

await Effect.runPromise(
  program.pipe(Effect.provide(MyServiceTest))
);
```

### 2. Use Direct Implementation for Unit Tests

For focused unit tests of business logic, instantiate the implementation class directly:

```typescript
// ✅ Good - Testing implementation details
const mockDep = { method: vi.fn() };
const service = new MyServiceImpl(mockDep);

const result = await Effect.runPromise(
  service.someMethod(args)
);
```

### 3. Provide Sensible Defaults

Test layers should have reasonable default implementations that work for most tests:

```typescript
// ✅ Good - Sensible defaults
export const MyServiceTest = Layer.mock(MyService, {
  getData: () => Effect.succeed({ id: "test-id", value: 42 }),
  saveData: () => Effect.void, // No-op for save operations
});
```

### 4. Document Test Layer Behavior

Add JSDoc comments explaining what the test layer does:

```typescript
/**
 * Test layer implementation
 *
 * Provides mock implementations that:
 * - Return successful no-op for all mutation operations
 * - Return sensible default data for queries
 * - Can be overridden for specific test scenarios
 */
export const MyServiceTest = Layer.mock(MyService, { ... });
```

### 5. Name Test Layers Consistently

Follow the naming convention: `{ServiceName}Test`

```typescript
// ✅ Good
export const MapNavigationServiceTest = ...
export const CrossBorderNavigationServiceTest = ...

// ❌ Bad
export const MockMapNavigation = ...
export const testCrossBorder = ...
```

## Creating New Test Layers

When creating a new test layer for a service, follow these steps:

### Step 1: Define the Test Layer

Add it to your service file alongside the live implementation:

```typescript
// my-service.ts

// Live implementation
export const MyServiceLive = Layer.succeed(
  MyService,
  new MyServiceImpl(),
);

// Test implementation
export const MyServiceTest = Layer.mock(MyService, {
  // Provide mock implementations
  queryMethod: () => Effect.succeed(mockData),
  mutationMethod: () => Effect.void,
});
```

### Step 2: Handle Dependencies

If your service depends on other services, provide those dependencies:

```typescript
export const MyServiceTest = Layer.mock(MyService, {
  method: () => Effect.succeed(mockData),
}).pipe(
  Layer.provide(DependencyServiceTest), // Provide dependencies
);
```

### Step 3: Document Usage

Add examples showing how to use the test layer:

```typescript
/**
 * Test layer implementation
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const service = yield* MyService;
 *   return yield* service.queryMethod();
 * });
 *
 * const result = await Effect.runPromise(
 *   program.pipe(Effect.provide(MyServiceTest))
 * );
 * ```
 */
export const MyServiceTest = ...
```

### Step 4: Add to Test Suite

Create integration tests demonstrating the test layer:

```typescript
describe("Integration Tests (using test layers)", () => {
  it("should work through the Effect layer system", async () => {
    const program = Effect.gen(function* () {
      const service = yield* MyService;
      return yield* service.method();
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MyServiceTest))
    );

    expect(result).toBeDefined();
  });
});
```

## References

- [Effect Documentation - Testing](https://effect.website/docs/testing/introduction)
- [Effect Documentation - Managing Layers](https://effect.website/docs/requirements-management/layers)
- [Layer.mock Reference](https://effect.website/docs/reference/effect/Layer/mock)

## Related Files

- `src/lib/services/map-navigation-service.ts` - MapNavigationService and test layer
- `src/lib/services/cross-border-navigation-service.ts` - CrossBorderNavigationService and test layer
- `src/lib/services/cross-border-navigation-service.spec.ts` - Example test file with both unit and integration tests
