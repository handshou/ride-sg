/**
 * Device Orientation Service
 * Provides compass heading and device orientation data
 */

import { Context, Effect } from "effect";

// Type extension for iOS Safari's webkitCompassHeading
interface DeviceOrientationEventWithWebkit extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

// Type for DeviceOrientationEvent constructor with requestPermission
interface DeviceOrientationEventConstructor {
  new (): DeviceOrientationEvent;
  prototype: DeviceOrientationEvent;
  requestPermission?: () => Promise<PermissionState>;
}

export class DeviceOrientationError extends Error {
  readonly _tag = "DeviceOrientationError" as const;
}

export interface DeviceOrientationService {
  readonly getCurrentHeading: Effect.Effect<
    number | null,
    DeviceOrientationError
  >;
  readonly watchHeading: (
    callback: (heading: number) => void,
  ) => Effect.Effect<() => void, DeviceOrientationError>;
  readonly requestPermission: Effect.Effect<boolean, DeviceOrientationError>;
}

export const DeviceOrientationServiceTag =
  Context.GenericTag<DeviceOrientationService>("DeviceOrientationService");

/**
 * Live implementation of DeviceOrientationService
 */
export const DeviceOrientationServiceLive = DeviceOrientationServiceTag.of({
  getCurrentHeading: Effect.tryPromise({
    try: async () => {
      return new Promise<number | null>((resolve) => {
        // Check if DeviceOrientationEvent is available
        if (!window.DeviceOrientationEvent) {
          resolve(null);
          return;
        }

        let hasResolved = false;

        const handleOrientation = (event: DeviceOrientationEvent) => {
          if (!hasResolved) {
            hasResolved = true;
            window.removeEventListener("deviceorientation", handleOrientation);

            // Get compass heading
            // webkitCompassHeading is for iOS Safari
            // alpha is for other browsers (but needs conversion)
            const heading = getCompassHeading(event);
            resolve(heading);
          }
        };

        window.addEventListener("deviceorientation", handleOrientation);

        // Timeout after 3 seconds
        setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            window.removeEventListener("deviceorientation", handleOrientation);
            resolve(null);
          }
        }, 3000);
      });
    },
    catch: (error) =>
      new DeviceOrientationError(
        `Failed to get device heading: ${error instanceof Error ? error.message : String(error)}`,
      ),
  }),

  watchHeading: (callback: (heading: number) => void) =>
    Effect.try({
      try: () => {
        if (!window.DeviceOrientationEvent) {
          throw new Error("Device orientation not supported");
        }

        const handleOrientation = (event: DeviceOrientationEvent) => {
          const heading = getCompassHeading(event);
          if (heading !== null) {
            callback(heading);
          }
        };

        window.addEventListener("deviceorientation", handleOrientation);

        // Return cleanup function
        return () => {
          window.removeEventListener("deviceorientation", handleOrientation);
        };
      },
      catch: (error) =>
        new DeviceOrientationError(
          `Failed to watch device heading: ${error instanceof Error ? error.message : String(error)}`,
        ),
    }),

  requestPermission: Effect.tryPromise({
    try: async () => {
      // Check if we need to request permission (iOS 13+)
      const DeviceOrientationEventTyped =
        DeviceOrientationEvent as unknown as DeviceOrientationEventConstructor;
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEventTyped.requestPermission === "function"
      ) {
        const response = await DeviceOrientationEventTyped.requestPermission();
        return response === "granted";
      }
      // Permission not needed or already granted
      return true;
    },
    catch: (error) =>
      new DeviceOrientationError(
        `Failed to request orientation permission: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ),
  }),
});

/**
 * Get compass heading from DeviceOrientationEvent
 * Handles both iOS (webkitCompassHeading) and standard (alpha) implementations
 */
function getCompassHeading(event: DeviceOrientationEvent): number | null {
  // Check for iOS Safari's webkitCompassHeading
  const eventWithWebkit = event as DeviceOrientationEventWithWebkit;
  if (eventWithWebkit.webkitCompassHeading !== undefined) {
    // webkitCompassHeading gives us the heading directly
    return eventWithWebkit.webkitCompassHeading;
  }

  // For other browsers, use alpha (but it needs adjustment)
  if (event.alpha !== null && event.absolute) {
    // Alpha is the rotation around the z-axis (0-360)
    // When absolute is true, it's relative to Earth's coordinate frame
    // Convert alpha to compass heading (0 = North)
    return (360 - event.alpha) % 360;
  }

  // If alpha is available but not absolute, we can still use it
  // but it won't be a true compass heading
  if (event.alpha !== null) {
    // This is relative to device's initial orientation
    // Not ideal but better than nothing
    return (360 - event.alpha) % 360;
  }

  return null;
}

/**
 * Fallback service that simulates compass readings
 */
export const DeviceOrientationServiceMock = DeviceOrientationServiceTag.of({
  getCurrentHeading: Effect.succeed(45), // Mock heading: Northeast

  watchHeading: (callback: (heading: number) => void) =>
    Effect.try({
      try: () => {
        // Simulate heading changes
        let heading = 0;
        const interval = setInterval(() => {
          heading = (heading + 5) % 360;
          callback(heading);
        }, 1000);

        return () => clearInterval(interval);
      },
      catch: () => new DeviceOrientationError("Mock service error"),
    }),

  requestPermission: Effect.succeed(true),
});

/**
 * Get appropriate service based on environment
 */
export const getDeviceOrientationService = () => {
  if (typeof window !== "undefined" && window.DeviceOrientationEvent) {
    return DeviceOrientationServiceLive;
  }
  return DeviceOrientationServiceMock;
};
