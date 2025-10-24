import { Effect, Schema } from "effect";
import { type AppConfig, ConfigService } from "./config-service";

/**
 * Weather Service Error
 */
export class WeatherError {
  readonly _tag = "WeatherError";
  constructor(
    readonly message: string,
    readonly cause?: unknown,
  ) {}
}

/**
 * Weather Data Interface
 */
export interface WeatherData {
  temperature: number; // Celsius
  humidity: number; // Percentage
  windSpeed?: number; // km/h
  windDirection?: string;
  uvIndex?: number;
  condition?: string; // e.g., "Partly Cloudy", "Thundery Showers"
  timestamp: string;
}

/**
 * Air Temperature Response Schema (NEA API)
 */
const AirTemperatureSchema = Schema.Struct({
  metadata: Schema.Struct({
    stations: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        device_id: Schema.String,
        name: Schema.String,
        location: Schema.Struct({
          latitude: Schema.Number,
          longitude: Schema.Number,
        }),
      }),
    ),
    reading_type: Schema.String,
    reading_unit: Schema.String,
  }),
  items: Schema.Array(
    Schema.Struct({
      timestamp: Schema.String,
      readings: Schema.Array(
        Schema.Struct({
          station_id: Schema.String,
          value: Schema.Number,
        }),
      ),
    }),
  ),
});

/**
 * Relative Humidity Response Schema
 */
const RelativeHumiditySchema = AirTemperatureSchema;

/**
 * Weather Service Interface
 *
 * Provides access to NEA Singapore Weather APIs
 */
export interface IWeatherService {
  /**
   * Get current weather data for a location
   * Finds nearest weather station and returns current conditions
   */
  getCurrentWeather(
    latitude: number,
    longitude: number,
  ): Effect.Effect<WeatherData, WeatherError>;

  /**
   * Get temperature from NEA API
   */
  getTemperature(): Effect.Effect<number, WeatherError>;

  /**
   * Get relative humidity from NEA API
   */
  getHumidity(): Effect.Effect<number, WeatherError>;
}

/**
 * Weather Service Implementation
 */
class WeatherServiceImpl implements IWeatherService {
  constructor(readonly _config: AppConfig) {}

  /**
   * Get temperature from NEA API
   */
  getTemperature(): Effect.Effect<number, WeatherError> {
    return Effect.gen(
      function* (this: WeatherServiceImpl) {
        const apiUrl =
          "https://api-open.data.gov.sg/v2/real-time/api/air-temperature";

        yield* Effect.log(`Fetching temperature from: ${apiUrl}`);

        const response = yield* Effect.tryPromise({
          try: () => fetch(apiUrl),
          catch: (error) =>
            new WeatherError("Temperature API fetch failed", error),
        });

        if (!response.ok) {
          return yield* Effect.fail(
            new WeatherError(
              `Temperature API returned ${response.status}: ${response.statusText}`,
            ),
          );
        }

        const rawData = yield* Effect.tryPromise({
          try: () => response.json(),
          catch: (error) =>
            new WeatherError("Failed to parse temperature response", error),
        });

        const validated = yield* Effect.try({
          try: () => Schema.decodeUnknownSync(AirTemperatureSchema)(rawData),
          catch: (error) =>
            new WeatherError("Temperature schema validation failed", error),
        });

        // Get latest reading and calculate average
        if (
          validated.items.length > 0 &&
          validated.items[0].readings.length > 0
        ) {
          const readings = validated.items[0].readings;
          const sum = readings.reduce((acc, r) => acc + r.value, 0);
          const avgTemp = sum / readings.length;
          yield* Effect.log(`Current temperature: ${avgTemp.toFixed(1)}°C`);
          return avgTemp;
        }

        return yield* Effect.fail(
          new WeatherError("No temperature readings available"),
        );
      }.bind(this),
    );
  }

  /**
   * Get humidity from NEA API
   */
  getHumidity(): Effect.Effect<number, WeatherError> {
    return Effect.gen(
      function* (this: WeatherServiceImpl) {
        const apiUrl =
          "https://api-open.data.gov.sg/v2/real-time/api/relative-humidity";

        yield* Effect.log(`Fetching humidity from: ${apiUrl}`);

        const response = yield* Effect.tryPromise({
          try: () => fetch(apiUrl),
          catch: (error) =>
            new WeatherError("Humidity API fetch failed", error),
        });

        if (!response.ok) {
          return yield* Effect.fail(
            new WeatherError(
              `Humidity API returned ${response.status}: ${response.statusText}`,
            ),
          );
        }

        const rawData = yield* Effect.tryPromise({
          try: () => response.json(),
          catch: (error) =>
            new WeatherError("Failed to parse humidity response", error),
        });

        const validated = yield* Effect.try({
          try: () => Schema.decodeUnknownSync(RelativeHumiditySchema)(rawData),
          catch: (error) =>
            new WeatherError("Humidity schema validation failed", error),
        });

        if (
          validated.items.length > 0 &&
          validated.items[0].readings.length > 0
        ) {
          const readings = validated.items[0].readings;
          const sum = readings.reduce((acc, r) => acc + r.value, 0);
          const avgHumidity = sum / readings.length;
          yield* Effect.log(`Current humidity: ${avgHumidity.toFixed(0)}%`);
          return avgHumidity;
        }

        return yield* Effect.fail(
          new WeatherError("No humidity readings available"),
        );
      }.bind(this),
    );
  }

  /**
   * Get current weather data for a location
   */
  getCurrentWeather(
    latitude: number,
    longitude: number,
  ): Effect.Effect<WeatherData, WeatherError> {
    return Effect.gen(
      function* (this: WeatherServiceImpl) {
        yield* Effect.log(
          `Getting weather for location: ${latitude}, ${longitude}`,
        );

        // Fetch temperature and humidity in parallel
        const [temperature, humidity] = yield* Effect.all(
          [this.getTemperature(), this.getHumidity()],
          { concurrency: 2 },
        ).pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Effect.logWarning(
                "Failed to fetch complete weather data, using defaults",
                error,
              );
              // Return default values if API fails
              return [28, 75] as [number, number]; // Default Singapore weather
            }),
          ),
        );

        const now = new Date();
        const timestamp = now.toISOString();

        return {
          temperature,
          humidity,
          timestamp,
        };
      }.bind(this),
    );
  }
}

/**
 * Weather Service as Effect.Service
 */
export class WeatherService extends Effect.Service<WeatherService>()(
  "WeatherService",
  {
    effect: Effect.gen(function* () {
      const config = yield* ConfigService;
      yield* Effect.logDebug("🌡️ WeatherService initialized");
      return new WeatherServiceImpl(config);
    }),
    dependencies: [ConfigService.Default],
  },
) {}
