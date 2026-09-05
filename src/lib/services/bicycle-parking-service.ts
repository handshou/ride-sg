import { Context, Effect, Schema } from "effect";
import {
  BicycleParkingCacheRepository,
  type BicycleParkingCacheRepositoryService,
} from "../repositories/bicycle-parking-cache-repository";
import type {
  BicycleParkingResponse,
  BicycleParkingResult,
} from "../schema/bicycle-parking.schema";
import { BicycleParkingResponseSchema } from "../schema/bicycle-parking.schema";
import type { AppConfig } from "./config-service";
import { ConfigService } from "./config-service";

/** Cached LTA results within this many degrees of the query point are reused. ~1 km. */
const CACHE_QUERY_THRESHOLD_DEGREES = 0.01;

/** Cached LTA results older than this are purged on each refresh. */
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Bicycle Parking Service Error
 */
export class BicycleParkingError {
  readonly _tag = "BicycleParkingError";
  constructor(readonly message: string) {}
}

/**
 * Bicycle Parking Service Interface
 *
 * Fetches bicycle parking data from LTA DataMall API, caching results through
 * the provider-neutral BicycleParkingCacheRepository.
 */
export interface IBicycleParkingService {
  fetchNearbyParking: (
    lat: number,
    long: number,
  ) => Effect.Effect<BicycleParkingResult[], BicycleParkingError>;
}

/**
 * Implementation of Bicycle Parking Service
 */
class BicycleParkingServiceImpl {
  constructor(
    private readonly config: AppConfig,
    private readonly cache: BicycleParkingCacheRepositoryService,
  ) {}

  fetchNearbyParking(
    lat: number,
    long: number,
  ): Effect.Effect<BicycleParkingResult[], BicycleParkingError> {
    return Effect.gen(
      function* (this: BicycleParkingServiceImpl) {
        yield* Effect.log(
          `Fetching bicycle parking near (${lat.toFixed(4)}, ${long.toFixed(4)})`,
        );

        const cacheArea = {
          queryLatitude: lat,
          queryLongitude: long,
          thresholdDegrees: CACHE_QUERY_THRESHOLD_DEGREES,
        };

        // Step 1: Check cache first
        const cachedResults = yield* this.cache
          .findNearQueryPoint(cacheArea)
          .pipe(
            Effect.catchAll((error) =>
              Effect.logWarning(
                "Bicycle parking cache lookup failed, fetching from LTA",
                error,
              ).pipe(Effect.as([])),
            ),
          );

        if (cachedResults.length > 0) {
          yield* Effect.log(
            `Found ${cachedResults.length} cached bicycle parking results`,
          );
          return cachedResults.map(
            (cached): BicycleParkingResult => ({
              id: cached.id,
              description: cached.description,
              latitude: cached.latitude,
              longitude: cached.longitude,
              rackType: cached.rackType,
              rackCount: cached.rackCount,
              hasShelter: cached.hasShelter,
              queryLatitude: cached.queryLatitude,
              queryLongitude: cached.queryLongitude,
              timestamp: cached.timestamp,
            }),
          );
        }

        // Step 2: Fetch from LTA API
        yield* Effect.log("No cache found, fetching from LTA DataMall API...");

        const ltaKey = this.config.lta.accountKey;

        const apiUrl = `https://datamall2.mytransport.sg/ltaodataservice/BicycleParkingv2?Lat=${lat}&Long=${long}`;

        yield* Effect.log(`📍 LTA API URL: ${apiUrl}`);
        yield* Effect.log(`🔑 Using AccountKey: ${ltaKey.substring(0, 5)}...`);

        const response = yield* Effect.tryPromise({
          try: () =>
            fetch(apiUrl, {
              headers: {
                AccountKey: ltaKey,
                Accept: "application/json",
              },
            }),
          catch: (error) =>
            new BicycleParkingError(`LTA API fetch failed: ${error}`),
        });

        yield* Effect.log(`📡 LTA API response status: ${response.status}`);

        if (!response.ok) {
          yield* Effect.logError(
            `LTA API error: ${response.status} - ${response.statusText}`,
          );
          const errorText = yield* Effect.tryPromise({
            try: () => response.text(),
            catch: () => "Could not read error response",
          });
          yield* Effect.logError(`LTA API error body: ${errorText}`);
          return yield* Effect.fail(
            new BicycleParkingError(`LTA API returned ${response.status}`),
          );
        }

        // Step 3: Parse and validate response
        const rawData = yield* Effect.tryPromise({
          try: () => response.json(),
          catch: (error) =>
            new BicycleParkingError(`Failed to parse LTA response: ${error}`),
        });

        yield* Effect.log(
          `📦 Raw API response: ${JSON.stringify(rawData).substring(0, 200)}...`,
        );

        const apiResponse: BicycleParkingResponse = yield* Effect.try({
          try: () =>
            Schema.decodeUnknownSync(BicycleParkingResponseSchema)(rawData),
          catch: (error) =>
            new BicycleParkingError(
              `Schema validation failed: ${error instanceof Error ? error.message : String(error)}`,
            ),
        });

        yield* Effect.log(
          `LTA API returned ${apiResponse.value.length} bicycle parking locations`,
        );

        if (apiResponse.value.length === 0) {
          yield* Effect.logWarning(
            `⚠️ No bicycle parking found near (${lat.toFixed(4)}, ${long.toFixed(4)}). This location may not have bicycle parking facilities nearby.`,
          );
        }

        // Step 4: Convert to internal format
        const timestamp = Date.now();
        const results: BicycleParkingResult[] = apiResponse.value.map(
          (location, index) => ({
            id: `lta-${timestamp}-${index}`,
            description: location.Description,
            latitude: location.Latitude,
            longitude: location.Longitude,
            rackType: location.RackType,
            rackCount: location.RackCount,
            hasShelter: location.ShelterIndicator === "Y",
            queryLatitude: lat,
            queryLongitude: long,
            timestamp,
          }),
        );

        // Step 5: Save to cache and purge stale entries
        if (results.length > 0) {
          const saved = yield* this.cache
            .replaceForQueryPoint(
              cacheArea,
              results.map((r) => ({
                description: r.description,
                latitude: r.latitude,
                longitude: r.longitude,
                rackType: r.rackType,
                rackCount: r.rackCount,
                hasShelter: r.hasShelter,
                queryLatitude: r.queryLatitude,
                queryLongitude: r.queryLongitude,
                timestamp: r.timestamp,
              })),
            )
            .pipe(
              Effect.tap((saved) =>
                Effect.log(
                  `Saved ${saved.length} bicycle parking locations to cache`,
                ),
              ),
              Effect.catchAll((error) =>
                Effect.logWarning(
                  "Failed to save bicycle parking to cache",
                  error,
                ).pipe(Effect.as(null)),
              ),
            );

          yield* this.cache
            .deleteOlderThan(timestamp - CACHE_MAX_AGE_MS)
            .pipe(Effect.catchAll(() => Effect.succeed(0)));

          // Prefer persisted ids so cached and fresh results share identity
          if (saved && saved.length === results.length) {
            return saved.map((record): BicycleParkingResult => ({ ...record }));
          }
        }

        return results;
      }.bind(this),
    ).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.logError("Bicycle parking fetch error", error);
          return yield* Effect.fail(
            error instanceof BicycleParkingError
              ? error
              : new BicycleParkingError("Failed to fetch bicycle parking data"),
          );
        }),
      ),
    );
  }
}

/**
 * BicycleParkingService as Effect.Service
 * Provides auto-generated accessors and cleaner DI
 */
export class BicycleParkingService extends Effect.Service<BicycleParkingService>()(
  "BicycleParkingService",
  {
    effect: Effect.gen(function* () {
      const config = yield* ConfigService;
      const cache = yield* BicycleParkingCacheRepository;
      yield* Effect.logDebug("🚲 BicycleParkingService initialized");
      return new BicycleParkingServiceImpl(config, cache);
    }),
    dependencies: [ConfigService.Default],
  },
) {}

/**
 * Legacy export for BicycleParkingServiceTag (for backwards compatibility during migration)
 * This will be removed once all services are migrated
 */
export const BicycleParkingServiceTag =
  Context.GenericTag<IBicycleParkingService>("BicycleParkingService");
