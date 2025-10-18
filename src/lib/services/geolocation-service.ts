import { Context, Effect, Layer } from "effect";

export interface GeolocationService {
  getCurrentPosition(): Effect.Effect<
    { latitude: number; longitude: number },
    GeolocationError,
    never
  >;
}

export class GeolocationError {
  constructor(
    public readonly code: number,
    public readonly message: string,
  ) {}
}

export class GeolocationServiceImpl implements GeolocationService {
  getCurrentPosition(): Effect.Effect<
    { latitude: number; longitude: number },
    GeolocationError,
    never
  > {
    return Effect.tryPromise({
      try: () => this.getCurrentPositionPromise(),
      catch: (error) => {
        if (error instanceof GeolocationError) {
          return error;
        }
        return new GeolocationError(0, `Unknown error: ${error}`);
      },
    });
  }

  private getCurrentPositionPromise(): Promise<{
    latitude: number;
    longitude: number;
  }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(
          new GeolocationError(
            0,
            "Geolocation is not supported by this browser",
          ),
        );
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let message = "Unknown geolocation error";
          switch (error.code) {
            case 1: // PERMISSION_DENIED
              message = "Location access denied by user";
              break;
            case 2: // POSITION_UNAVAILABLE
              message = "Location information is unavailable";
              break;
            case 3: // TIMEOUT
              message = "Location request timed out";
              break;
          }
          reject(new GeolocationError(error.code, message));
        },
        options,
      );
    });
  }
}

export const GeolocationServiceTag =
  Context.GenericTag<GeolocationService>("GeolocationService");

export const GeolocationServiceLive = Layer.succeed(
  GeolocationServiceTag,
  new GeolocationServiceImpl(),
);

// Helper function for client-side usage
export const getCurrentPositionEffect = (): Effect.Effect<
  { latitude: number; longitude: number },
  GeolocationError,
  never
> => {
  return Effect.gen(function* () {
    const service = yield* GeolocationServiceTag;
    return yield* service.getCurrentPosition();
  }).pipe(
    Effect.provide(GeolocationServiceLive),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError("Geolocation failed", error);
        // Return fallback coordinates (Marina Bay, Singapore)
        return { latitude: 1.351616, longitude: 103.808053 };
      }),
    ),
  );
};
