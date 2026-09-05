import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { BicycleParkingCacheRepository } from "./bicycle-parking-cache-repository";
import { makePostgresBicycleParkingCacheRepositoryLayer } from "./postgres-bicycle-parking-cache-repository";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://ride_sg:ride_sg@127.0.0.1:54329/ride_sg";
const layer = makePostgresBicycleParkingCacheRepositoryLayer(databaseUrl);

describe("PostgreSQL BicycleParkingCacheRepository", () => {
  it("replaces entries for a query point and finds them by bounding box", async () => {
    // Unique query point far from real data so parallel runs do not collide
    const queryLatitude = 40 + Math.random();
    const queryLongitude = -70 - Math.random();
    const area = { queryLatitude, queryLongitude, thresholdDegrees: 0.01 };
    const timestamp = Date.now();

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* BicycleParkingCacheRepository;
        const first = yield* repository.replaceForQueryPoint(area, [
          {
            description: "Old rack",
            latitude: queryLatitude,
            longitude: queryLongitude,
            rackType: "Yellow Box",
            rackCount: 4,
            hasShelter: false,
            queryLatitude,
            queryLongitude,
            timestamp: timestamp - 1000,
          },
        ]);
        const second = yield* repository.replaceForQueryPoint(area, [
          {
            description: "New rack A",
            latitude: queryLatitude + 0.001,
            longitude: queryLongitude,
            rackType: "Racks",
            rackCount: 10,
            hasShelter: true,
            queryLatitude,
            queryLongitude,
            timestamp,
          },
          {
            description: "New rack B",
            latitude: queryLatitude - 0.001,
            longitude: queryLongitude,
            rackType: "Racks",
            rackCount: 6,
            hasShelter: false,
            queryLatitude,
            queryLongitude,
            timestamp,
          },
        ]);
        const nearby = yield* repository.findNearQueryPoint(area);
        const farAway = yield* repository.findNearQueryPoint({
          ...area,
          queryLatitude: queryLatitude + 1,
        });
        // Purge only this test's rows; the shared dev database may hold
        // other fresh cache entries, so only assert on the bounding box.
        yield* repository.replaceForQueryPoint(area, []);
        const afterCleanup = yield* repository.findNearQueryPoint(area);
        const deleted = yield* repository.deleteOlderThan(0);
        return { first, second, nearby, farAway, afterCleanup, deleted };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.first).toHaveLength(1);
    expect(result.second).toHaveLength(2);
    expect(result.nearby.map((entry) => entry.description).sort()).toEqual([
      "New rack A",
      "New rack B",
    ]);
    expect(result.nearby[0]).toMatchObject({ hasShelter: true, rackCount: 10 });
    expect(result.farAway).toEqual([]);
    expect(result.afterCleanup).toEqual([]);
    expect(result.deleted).toBe(0);
  });
});
