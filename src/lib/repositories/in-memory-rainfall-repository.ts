import { Effect, Layer, Ref } from "effect";
import {
  type RainfallReadingRecord,
  RainfallRepository,
  type RainfallRepositoryService,
} from "./rainfall-repository";

/** In-memory rainfall adapter for isolated tests. */
export const InMemoryRainfallRepositoryLayer = Layer.effect(
  RainfallRepository,
  Effect.gen(function* () {
    const readingsRef = yield* Ref.make<ReadonlyArray<RainfallReadingRecord>>(
      [],
    );

    const repository: RainfallRepositoryService = {
      saveReadings: (readings) =>
        Ref.update(readingsRef, (existing) => [...existing, ...readings]),
      getLatestReadings: () =>
        Ref.get(readingsRef).pipe(
          Effect.map((readings) => {
            if (readings.length === 0) return [];
            const latestFetchedAt = Math.max(
              ...readings.map((reading) => reading.fetchedAt),
            );
            return readings.filter(
              (reading) => reading.fetchedAt === latestFetchedAt,
            );
          }),
        ),
      deleteOlderThan: (cutoffTimestamp) =>
        Ref.modify(readingsRef, (readings) => {
          const kept = readings.filter(
            (reading) => reading.fetchedAt >= cutoffTimestamp,
          );
          return [readings.length - kept.length, kept];
        }),
    };

    return repository;
  }),
);
