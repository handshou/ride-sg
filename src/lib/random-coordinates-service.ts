import { Context, Effect, Layer } from "effect";

export interface RandomCoordinatesService {
  generateRandomCoordinates(): Effect.Effect<
    { latitude: number; longitude: number },
    never,
    never
  >;
}

export class RandomCoordinatesServiceImpl implements RandomCoordinatesService {
  generateRandomCoordinates(): Effect.Effect<
    { latitude: number; longitude: number },
    never,
    never
  > {
    return Effect.sync(() => {
      // Generate random coordinates within Singapore bounds
      const latitude = 1.16 + Math.random() * (1.47 - 1.16);
      const longitude = 103.6 + Math.random() * (104.0 - 103.6);

      return { latitude, longitude };
    });
  }
}

export const RandomCoordinatesServiceTag =
  Context.GenericTag<RandomCoordinatesService>("RandomCoordinatesService");

export const RandomCoordinatesServiceLive = Layer.succeed(
  RandomCoordinatesServiceTag,
  new RandomCoordinatesServiceImpl(),
);

// Helper function for client-side usage
export const generateRandomCoordinatesEffect = (): Effect.Effect<
  { latitude: number; longitude: number },
  never,
  never
> => {
  return Effect.gen(function* () {
    const service = yield* RandomCoordinatesServiceTag;
    return yield* service.generateRandomCoordinates();
  }).pipe(
    Effect.provide(RandomCoordinatesServiceLive),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError("Random coordinate generation failed", error);
        // Return fallback coordinates (Marina Bay)
        return { latitude: 1.351616, longitude: 103.808053 };
      }),
    ),
  );
};
