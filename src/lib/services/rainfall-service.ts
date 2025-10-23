import { Context, Effect, Schema } from "effect";
import {
  type RainfallResponse,
  RainfallResponseSchema,
} from "../schema/rainfall.schema";
import { type AppConfig, ConfigService } from "./config-service";

/**
 * Rainfall Service Error
 */
export class RainfallError {
  readonly _tag = "RainfallError";
  constructor(
    readonly message: string,
    readonly cause?: unknown,
  ) {}
}

/**
 * Rainfall Service Interface
 *
 * Provides access to NEA Singapore Rainfall API with Effect-TS patterns
 */
export interface IRainfallService {
  /**
   * Build NEA Rainfall API URL with optional date parameter
   * @param date Optional date in YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss format
   */
  buildApiUrl(date?: string): Effect.Effect<string, never>;

  /**
   * Fetch rainfall data from NEA API
   * @param date Optional date parameter for historical data
   */
  fetchRainfallData(
    date?: string,
  ): Effect.Effect<RainfallResponse, RainfallError>;
}

/**
 * Rainfall Service Implementation
 */
class RainfallServiceImpl implements IRainfallService {
  constructor(private readonly config: AppConfig) {}

  /**
   * Build NEA Rainfall API URL
   * Uses centralized config instead of hardcoding URLs
   */
  buildApiUrl(date?: string): Effect.Effect<string, never> {
    return Effect.sync(() => {
      const url = new URL(this.config.urls.neaRainfall);
      if (date) {
        url.searchParams.set("date", date);
      }
      return url.toString();
    });
  }

  /**
   * Fetch rainfall data from NEA API with proper error handling
   */
  fetchRainfallData(
    date?: string,
  ): Effect.Effect<RainfallResponse, RainfallError> {
    return Effect.gen(
      function* (this: RainfallServiceImpl) {
        yield* Effect.log("Building NEA Rainfall API URL");
        const apiUrl = yield* this.buildApiUrl(date);

        yield* Effect.log(`Fetching rainfall data from: ${apiUrl}`);

        const response = yield* Effect.tryPromise({
          try: () => fetch(apiUrl),
          catch: (error) => new RainfallError("API fetch failed", error),
        });

        if (!response.ok) {
          yield* Effect.logError(
            `NEA API error: ${response.status} ${response.statusText}`,
          );
          return yield* Effect.fail(
            new RainfallError(
              `API returned ${response.status}: ${response.statusText}`,
            ),
          );
        }

        const rawData = yield* Effect.tryPromise({
          try: () => response.json(),
          catch: (error) =>
            new RainfallError("Failed to parse JSON response", error),
        });

        // Validate with Effect Schema
        const validated = yield* Effect.try({
          try: () => Schema.decodeUnknownSync(RainfallResponseSchema)(rawData),
          catch: (error) =>
            new RainfallError("Schema validation failed", error),
        });

        if (validated.code !== 0) {
          yield* Effect.logWarning(
            `NEA API returned non-zero code: ${validated.code}`,
          );
          if (validated.errorMsg) {
            return yield* Effect.fail(new RainfallError(validated.errorMsg));
          }
        }

        yield* Effect.log(
          `Successfully fetched ${validated.data.stations.length} stations, ` +
            `${validated.data.readings.length} reading sets`,
        );

        return validated;
      }.bind(this),
    );
  }
}

/**
 * Rainfall Service as Effect.Service
 */
export class RainfallService extends Effect.Service<RainfallService>()(
  "RainfallService",
  {
    effect: Effect.gen(function* () {
      const config = yield* ConfigService;
      yield* Effect.logDebug("🌧️ RainfallService initialized");
      return new RainfallServiceImpl(config);
    }),
    dependencies: [ConfigService.Default],
  },
) {}

/**
 * Legacy export for backwards compatibility
 */
export const RainfallServiceTag =
  Context.GenericTag<IRainfallService>("RainfallService");
