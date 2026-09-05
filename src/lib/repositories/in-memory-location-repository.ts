import { Effect, Layer, Ref } from "effect";
import {
  type LocationRecord,
  LocationRepository,
  type LocationRepositoryService,
} from "./location-repository";

const initialLocations: ReadonlyArray<LocationRecord> = [
  {
    id: "in-memory-orchard-road",
    title: "Saved: Orchard Road",
    description: "Shopping district - saved by user (in-memory data)",
    latitude: 1.3048,
    longitude: 103.8318,
    source: "database",
    timestamp: 1_700_000_000_000,
    city: "singapore",
    isRandomizable: true,
  },
  {
    id: "in-memory-sentosa-island",
    title: "Saved: Sentosa Island",
    description: "Resort island - frequently visited (in-memory data)",
    latitude: 1.2494,
    longitude: 103.8303,
    source: "database",
    timestamp: 1_699_913_600_000,
    city: "singapore",
    isRandomizable: true,
  },
];

/** In-memory location adapter for isolated tests and local fallback behavior. */
export const InMemoryLocationRepositoryLayer = Layer.effect(
  LocationRepository,
  Effect.gen(function* () {
    const locationsRef = yield* Ref.make(initialLocations);

    const repository: LocationRepositoryService = {
      searchLocations: (query, city) =>
        Ref.get(locationsRef).pipe(
          Effect.map((locations) => {
            const normalizedQuery = query.trim().toLowerCase();
            return locations.filter(
              (location) =>
                (!city || location.city === city) &&
                (location.title.toLowerCase().includes(normalizedQuery) ||
                  location.description.toLowerCase().includes(normalizedQuery)),
            );
          }),
        ),
      listRandomizableLocations: (city) =>
        Ref.get(locationsRef).pipe(
          Effect.map((locations) =>
            locations.filter(
              (location) => location.city === city && location.isRandomizable,
            ),
          ),
        ),
      saveLocation: (input) =>
        Effect.gen(function* () {
          const savedLocation: LocationRecord = {
            ...input,
            id: crypto.randomUUID(),
            isRandomizable: input.isRandomizable ?? false,
          };
          yield* Ref.update(locationsRef, (locations) => [
            ...locations.filter(
              (location) =>
                location.city !== savedLocation.city ||
                location.title.trim().toLowerCase() !==
                  savedLocation.title.trim().toLowerCase(),
            ),
            savedLocation,
          ]);
          return savedLocation;
        }),
      deleteLocation: (id) =>
        Ref.update(locationsRef, (locations) =>
          locations.filter((location) => location.id !== id),
        ),
    };

    return repository;
  }),
);
