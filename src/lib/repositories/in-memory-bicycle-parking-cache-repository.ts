import { Effect, Layer, Ref } from "effect";
import {
  type BicycleParkingCacheRecord,
  BicycleParkingCacheRepository,
  type BicycleParkingCacheRepositoryService,
  type QueryPointArea,
} from "./bicycle-parking-cache-repository";

const isInsideArea = (
  record: Pick<BicycleParkingCacheRecord, "queryLatitude" | "queryLongitude">,
  area: QueryPointArea,
) =>
  Math.abs(record.queryLatitude - area.queryLatitude) <=
    area.thresholdDegrees &&
  Math.abs(record.queryLongitude - area.queryLongitude) <=
    area.thresholdDegrees;

/** In-memory cache adapter for isolated tests. */
export const InMemoryBicycleParkingCacheRepositoryLayer = Layer.effect(
  BicycleParkingCacheRepository,
  Effect.gen(function* () {
    const entriesRef = yield* Ref.make<
      ReadonlyArray<BicycleParkingCacheRecord>
    >([]);

    const repository: BicycleParkingCacheRepositoryService = {
      findNearQueryPoint: (area) =>
        Ref.get(entriesRef).pipe(
          Effect.map((entries) =>
            entries.filter((entry) => isInsideArea(entry, area)),
          ),
        ),
      replaceForQueryPoint: (area, inputs) =>
        Effect.gen(function* () {
          const inserted: ReadonlyArray<BicycleParkingCacheRecord> = inputs.map(
            (input) => ({ ...input, id: crypto.randomUUID() }),
          );
          yield* Ref.update(entriesRef, (entries) => [
            ...entries.filter((entry) => !isInsideArea(entry, area)),
            ...inserted,
          ]);
          return inserted;
        }),
      deleteOlderThan: (cutoffTimestamp) =>
        Ref.modify(entriesRef, (entries) => {
          const kept = entries.filter(
            (entry) => entry.timestamp >= cutoffTimestamp,
          );
          return [entries.length - kept.length, kept];
        }),
    };

    return repository;
  }),
);
