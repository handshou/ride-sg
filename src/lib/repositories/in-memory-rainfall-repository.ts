import { Effect, Layer, Ref } from "effect";
import {
  type RainfallReadingRecord,
  RainfallRepository,
  type RainfallRepositoryService,
} from "./rainfall-repository";

/** In-memory rainfall adapter for isolated tests. One entry per station. */
export const InMemoryRainfallRepositoryLayer = Layer.effect(
  RainfallRepository,
  Effect.gen(function* () {
    const stationsRef = yield* Ref.make<
      ReadonlyMap<string, RainfallReadingRecord>
    >(new Map());

    const repository: RainfallRepositoryService = {
      saveReadings: (readings) =>
        Ref.modify(stationsRef, (stations) => {
          const next = new Map(stations);
          let changed = 0;
          for (const reading of readings) {
            const current = next.get(reading.stationId);
            if (current?.timestamp === reading.timestamp) continue;
            next.set(reading.stationId, reading);
            changed += 1;
          }
          return [changed, next];
        }),
      getLatestReadings: () =>
        Ref.get(stationsRef).pipe(
          Effect.map((stations) => {
            const readings = [...stations.values()];
            if (readings.length === 0) return [];
            const latest = readings
              .map((reading) => Date.parse(reading.timestamp))
              .reduce((a, b) => Math.max(a, b));
            return readings
              .filter((reading) => Date.parse(reading.timestamp) === latest)
              .sort((a, b) => a.stationId.localeCompare(b.stationId));
          }),
        ),
    };

    return repository;
  }),
);
