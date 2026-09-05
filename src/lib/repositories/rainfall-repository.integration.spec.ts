import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { makePostgresRainfallRepositoryLayer } from "./postgres-rainfall-repository";
import {
  type RainfallReadingRecord,
  RainfallRepository,
} from "./rainfall-repository";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://ride_sg:ride_sg@127.0.0.1:54329/ride_sg";
const layer = makePostgresRainfallRepositoryLayer(databaseUrl);

const reading = (
  fetchedAt: number,
  stationId: string,
  value: number,
): RainfallReadingRecord => ({
  stationId,
  stationName: `Station ${stationId}`,
  latitude: 1.3,
  longitude: 103.8,
  value,
  timestamp: new Date(fetchedAt).toISOString(),
  fetchedAt,
});

describe("PostgreSQL RainfallRepository", () => {
  it("returns only the most recent batch and purges old batches", async () => {
    // Far-future fetchedAt so this test's batch is always the latest row set
    const base = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000;
    const olderBatch = base - 60_000;
    const newerBatch = base;

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* RainfallRepository;
        yield* repository.saveReadings([
          reading(olderBatch, "T1", 1),
          reading(olderBatch, "T2", 2),
        ]);
        yield* repository.saveReadings([
          reading(newerBatch, "T1", 5),
          reading(newerBatch, "T2", 6),
          reading(newerBatch, "T3", 7),
        ]);
        const latest = yield* repository.getLatestReadings();
        const deleted = yield* repository.deleteOlderThan(newerBatch);
        const afterPurge = yield* repository.getLatestReadings();
        // Clean up this test's rows
        yield* repository.deleteOlderThan(newerBatch + 1);
        return { latest, deleted, afterPurge };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.latest.map((r) => r.stationId)).toEqual(["T1", "T2", "T3"]);
    expect(result.latest.every((r) => r.fetchedAt === newerBatch)).toBe(true);
    expect(result.deleted).toBe(2);
    expect(result.afterPurge).toHaveLength(3);
  });
});
