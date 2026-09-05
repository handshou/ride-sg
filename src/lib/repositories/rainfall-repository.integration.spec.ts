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
  readingTime: string,
  stationId: string,
  value: number,
  fetchedAt: number,
): RainfallReadingRecord => ({
  stationId,
  stationName: `Station ${stationId}`,
  latitude: 1.3,
  longitude: 103.8,
  value,
  timestamp: readingTime,
  fetchedAt,
});

describe("PostgreSQL RainfallRepository (latest snapshot)", () => {
  it("upserts one row per station, skips unchanged readings, returns newest batch", async () => {
    // Far-future reading times so this test's rows always win max()
    const run = `${Date.now()}`;
    const t1 = "2099-01-01T00:00:00+08:00";
    const t2 = "2099-01-01T00:05:00+08:00";
    const a = `TEST_A_${run}`;
    const b = `TEST_B_${run}`;
    const c = `TEST_C_${run}`;

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* RainfallRepository;
        const firstWrite = yield* repository.saveReadings([
          reading(t1, a, 1, 1),
          reading(t1, b, 2, 1),
        ]);
        // Same NEA timestamp: nothing should change
        const repeatWrite = yield* repository.saveReadings([
          reading(t1, a, 1, 2),
          reading(t1, b, 2, 2),
        ]);
        // NEA moved on, station b dropped out, station c appeared
        const secondWrite = yield* repository.saveReadings([
          reading(t2, a, 5, 3),
          reading(t2, c, 7, 3),
        ]);
        const latest = yield* repository.getLatestReadings();
        return { firstWrite, repeatWrite, secondWrite, latest };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.firstWrite).toBe(2);
    expect(result.repeatWrite).toBe(0);
    expect(result.secondWrite).toBe(2);
    expect(result.latest.map((r) => r.stationId)).toEqual([a, c]);
    expect(result.latest.every((r) => r.timestamp === t2)).toBe(true);
    expect(result.latest.find((r) => r.stationId === a)?.value).toBe(5);
  });
});
