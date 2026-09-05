import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { LocationRepository } from "./location-repository";
import { makePostgresLocationRepositoryLayer } from "./postgres-location-repository";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://ride_sg:ride_sg@127.0.0.1:54329/ride_sg";
const postgresLocationRepositoryLayer =
  makePostgresLocationRepositoryLayer(databaseUrl);

describe("PostgreSQL LocationRepository", () => {
  it("saves a location and lists it as randomizable for its city", async () => {
    const uniqueTitle = `TDD Marina ${Date.now()}`;

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* LocationRepository;
        const savedLocation = yield* repository.saveLocation({
          title: uniqueTitle,
          description: "Repository integration test location",
          latitude: 1.2834,
          longitude: 103.8607,
          source: "mapbox",
          timestamp: 1_788_543_600_000,
          city: "singapore",
          isRandomizable: true,
          postalCode: "018956",
        });
        const randomizableLocations =
          yield* repository.listRandomizableLocations("singapore");
        yield* repository.deleteLocation(savedLocation.id);

        return { savedLocation, randomizableLocations };
      }).pipe(Effect.provide(postgresLocationRepositoryLayer)),
    );

    expect(result.savedLocation).toMatchObject({
      title: uniqueTitle,
      city: "singapore",
      isRandomizable: true,
      postalCode: "018956",
    });
    expect(result.randomizableLocations).toContainEqual(result.savedLocation);
  });

  it("searches by city and replaces a location with the same normalized title", async () => {
    const uniqueTitle = `Provider Swap ${Date.now()}`;

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* LocationRepository;
        const firstSave = yield* repository.saveLocation({
          title: uniqueTitle,
          description: "First version",
          latitude: 1.3,
          longitude: 103.8,
          source: "exa",
          timestamp: 1_788_543_600_001,
          city: "singapore",
          isRandomizable: false,
        });
        const replacement = yield* repository.saveLocation({
          title: `  ${uniqueTitle.toUpperCase()}  `,
          description: "Replacement version",
          latitude: 1.31,
          longitude: 103.81,
          source: "mapbox",
          timestamp: 1_788_543_600_002,
          city: "singapore",
          isRandomizable: true,
        });
        const singaporeMatches = yield* repository.searchLocations(
          uniqueTitle,
          "singapore",
        );
        const jakartaMatches = yield* repository.searchLocations(
          uniqueTitle,
          "jakarta",
        );
        yield* repository.deleteLocation(replacement.id);

        return {
          firstSave,
          replacement,
          singaporeMatches,
          jakartaMatches,
        };
      }).pipe(Effect.provide(postgresLocationRepositoryLayer)),
    );

    expect(result.replacement.id).toBe(result.firstSave.id);
    expect(result.replacement.description).toBe("Replacement version");
    expect(result.singaporeMatches).toEqual([result.replacement]);
    expect(result.jakartaMatches).toEqual([]);
  });
});
