import { ConvexHttpClient } from "convex/browser";
import { Context, Effect, Schema } from "effect";
import { api } from "../../../convex/_generated/api";
import type {
  BicycleParkingResponse,
  BicycleParkingResult,
} from "../schema/bicycle-parking.schema";
import { BicycleParkingResponseSchema } from "../schema/bicycle-parking.schema";
import type { AppConfig } from "./config-service";
import { ConfigService } from "./config-service";

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
 * Fetches bicycle parking data from LTA DataMall API with Convex caching
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
  private convexClient: ConvexHttpClient | null = null;

  constructor(private readonly config: AppConfig) {}

  private getConvexClient() {
    return Effect.gen(
      function* (this: BicycleParkingServiceImpl) {
        if (this.convexClient) {
          return this.convexClient;
        }

        const deployment = this.config.convex.publicUrl;

        if (!deployment || deployment === "") {
          yield* Effect.logWarning(
            "Convex not configured, bicycle parking cache unavailable",
          );
          return null;
        }

        this.convexClient = new ConvexHttpClient(deployment);
        yield* Effect.log(`Convex client initialized for bicycle parking`);
        return this.convexClient;
      }.bind(this),
    );
  }

  fetchNearbyParking(
    lat: number,
    long: number,
  ): Effect.Effect<BicycleParkingResult[], BicycleParkingError> {
    return Effect.gen(
      function* (this: BicycleParkingServiceImpl) {
        yield* Effect.log(
          `Fetching bicycle parking near (${lat.toFixed(4)}, ${long.toFixed(4)})`,
        );

        // Step 1: Check Convex cache first
        const convexClient = yield* this.getConvexClient();
        if (convexClient) {
          const cachedResults = yield* Effect.tryPromise({
            try: () =>
              convexClient.query(
                api.bicycleParking.getBicycleParkingByLocation,
                {
                  queryLatitude: lat,
                  queryLongitude: long,
                  radiusThreshold: 0.01, // ~1km
                },
              ),
            catch: (error) =>
              new BicycleParkingError(`Failed to query Convex cache: ${error}`),
          }).pipe(Effect.catchAll(() => Effect.succeed([])));

          if (cachedResults.length > 0) {
            yield* Effect.log(
              `Found ${cachedResults.length} cached bicycle parking results`,
            );

            // Convert Convex results to BicycleParkingResult
            const results: BicycleParkingResult[] = cachedResults.map(
              (cached) => ({
                id: cached._id,
                description: cached.description,
                latitude: cached.latitude,
                longitude: cached.longitude,
                rackType: cached.rackType,
                rackCount: cached.rackCount,
                hasShelter: cached.shelterIndicator === "Y",
                queryLatitude: cached.queryLatitude,
                queryLongitude: cached.queryLongitude,
                timestamp: cached.timestamp,
              }),
            );

            return results;
          }
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

        // Step 5: Save to Convex cache
        if (convexClient && results.length > 0) {
          yield* Effect.tryPromise({
            try: () =>
              convexClient.mutation(api.bicycleParking.saveBicycleParking, {
                parkingLocations: results.map((r) => ({
                  description: r.description,
                  latitude: r.latitude,
                  longitude: r.longitude,
                  rackType: r.rackType,
                  rackCount: r.rackCount,
                  shelterIndicator: r.hasShelter ? "Y" : "N",
                  queryLatitude: r.queryLatitude,
                  queryLongitude: r.queryLongitude,
                  timestamp: r.timestamp,
                })),
                queryLatitude: lat,
                queryLongitude: long,
              }),
            catch: (error) => error, // Don't fail if cache save fails
          }).pipe(
            Effect.catchAll((error) =>
              Effect.gen(function* () {
                yield* Effect.logWarning(
                  `Failed to save bicycle parking to Convex: ${error}`,
                );
                return null;
              }),
            ),
          );

          yield* Effect.log(
            `Saved ${results.length} bicycle parking locations to Convex`,
          );
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
      return new BicycleParkingServiceImpl(config);
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
