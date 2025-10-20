import { v } from "convex/values";
import { internalAction, internalMutation, query } from "./_generated/server";

/**
 * Rainfall Data Management
 *
 * Handles real-time rainfall data from NEA Singapore API
 * - Stores station readings in database
 * - Provides real-time queries for client components
 * - Manages data lifecycle with cron-based updates
 */

/**
 * Mutation: Save rainfall data to database
 *
 * Accepts array of rainfall readings and saves them to the database.
 * Replaces existing data for the same timestamp to avoid duplicates.
 */
export const saveRainfallData = internalMutation({
  args: {
    readings: v.array(
      v.object({
        stationId: v.string(),
        stationName: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        value: v.number(),
        timestamp: v.string(),
        fetchedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    if (args.readings.length === 0) {
      console.log("No readings to save");
      return { success: true, count: 0 };
    }

    console.log(`Saving ${args.readings.length} rainfall readings...`);

    const timestamp = args.readings[0].timestamp;

    // Efficiently clear old readings for the same timestamp in a single query
    const existingReadings = await ctx.db
      .query("rainfall")
      .withIndex("by_timestamp", (q) => q.eq("timestamp", timestamp))
      .collect();

    // Batch delete operations
    if (existingReadings.length > 0) {
      await Promise.all(
        existingReadings.map((reading) => ctx.db.delete(reading._id)),
      );
      console.log(
        `Cleared ${existingReadings.length} duplicate readings for ${timestamp}`,
      );
    }

    // Batch insert new readings
    await Promise.all(
      args.readings.map((reading) => ctx.db.insert("rainfall", reading)),
    );

    console.log(`Successfully saved ${args.readings.length} rainfall readings`);
    return { success: true, count: args.readings.length };
  },
});

/**
 * Internal Mutation: Clean up old rainfall data (older than 2 days)
 *
 * Removes stale data to keep the database efficient.
 * Runs as a separate cron job once per day.
 */
export const cleanupOldRainfallData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Calculate cutoff time (2 days ago)
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;

    console.log(
      `Cleaning up rainfall data older than ${new Date(twoDaysAgo).toISOString()}`,
    );

    // Query old readings by fetchedAt index
    const oldReadings = await ctx.db
      .query("rainfall")
      .withIndex("by_fetched")
      .filter((q) => q.lt(q.field("fetchedAt"), twoDaysAgo))
      .collect();

    if (oldReadings.length === 0) {
      console.log("No old data to clean up");
      return { success: true, deletedCount: 0 };
    }

    // Batch delete old readings
    await Promise.all(oldReadings.map((reading) => ctx.db.delete(reading._id)));

    console.log(
      `Successfully deleted ${oldReadings.length} old rainfall readings`,
    );
    return { success: true, deletedCount: oldReadings.length };
  },
});

/**
 * Query: Get latest rainfall data for all stations
 *
 * Returns the most recent set of rainfall readings.
 * Used by client components for real-time visualization.
 * Can force mock data for testing/demo purposes.
 */
export const getLatestRainfall = query({
  args: {
    useMockData: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Force mock data if requested
    if (args.useMockData) {
      console.log("Mock data requested, returning mock rainfall data");
      return getMockRainfallData();
    }

    // Get the most recent fetchedAt timestamp
    const allReadings = await ctx.db
      .query("rainfall")
      .withIndex("by_fetched")
      .order("desc")
      .take(100); // Get recent readings

    if (allReadings.length === 0) {
      // Return mock data for testing/demo when no real data exists
      console.log("No real data found, returning mock rainfall data");
      return getMockRainfallData();
    }

    // Find the latest fetchedAt value
    const latestFetchedAt = allReadings[0].fetchedAt;

    // Filter readings with the latest fetchedAt
    const latestReadings = allReadings.filter(
      (r) => r.fetchedAt === latestFetchedAt,
    );

    console.log(`Returning ${latestReadings.length} latest rainfall readings`);
    return latestReadings;
  },
});

/**
 * Generate mock rainfall data for testing
 * Simulates various rainfall intensities across Singapore
 */
function getMockRainfallData() {
  const now = new Date().toISOString();
  const fetchedAt = Date.now();

  // Sample weather stations across Singapore with mock data
  return [
    // Heavy rain in north
    {
      _id: "mock_1" as any,
      _creationTime: fetchedAt,
      stationId: "S50",
      stationName: "Admiralty",
      latitude: 1.44387,
      longitude: 103.80101,
      value: 24.5, // Heavy rain (red)
      timestamp: now,
      fetchedAt: fetchedAt,
    },
    {
      _id: "mock_2" as any,
      _creationTime: fetchedAt,
      stationId: "S06",
      stationName: "Ang Mo Kio",
      latitude: 1.38,
      longitude: 103.8489,
      value: 18.2, // Moderate-heavy rain (orange-red)
      timestamp: now,
      fetchedAt: fetchedAt,
    },
    // Moderate rain in central
    {
      _id: "mock_3" as any,
      _creationTime: fetchedAt,
      stationId: "S44",
      stationName: "Clementi",
      latitude: 1.3337,
      longitude: 103.7768,
      value: 12.8, // Moderate rain (yellow)
      timestamp: now,
      fetchedAt: fetchedAt,
    },
    {
      _id: "mock_4" as any,
      _creationTime: fetchedAt,
      stationId: "S107",
      stationName: "East Coast Parkway",
      latitude: 1.3135,
      longitude: 103.9625,
      value: 8.5, // Light-moderate rain (green-yellow)
      timestamp: now,
      fetchedAt: fetchedAt,
    },
    // Light rain in south
    {
      _id: "mock_5" as any,
      _creationTime: fetchedAt,
      stationId: "S24",
      stationName: "Changi",
      latitude: 1.36667,
      longitude: 103.98333,
      value: 4.2, // Light rain (blue-green)
      timestamp: now,
      fetchedAt: fetchedAt,
    },
    {
      _id: "mock_6" as any,
      _creationTime: fetchedAt,
      stationId: "S104",
      stationName: "Jurong West",
      latitude: 1.33746,
      longitude: 103.69558,
      value: 3.1, // Light rain (blue)
      timestamp: now,
      fetchedAt: fetchedAt,
    },
    // No rain in some areas
    {
      _id: "mock_7" as any,
      _creationTime: fetchedAt,
      stationId: "S109",
      stationName: "Marina Barrage",
      latitude: 1.28059,
      longitude: 103.87022,
      value: 0.0, // No rain (gray)
      timestamp: now,
      fetchedAt: fetchedAt,
    },
    {
      _id: "mock_8" as any,
      _creationTime: fetchedAt,
      stationId: "S60",
      stationName: "Sentosa Island",
      latitude: 1.25,
      longitude: 103.82833,
      value: 0.0, // No rain (gray)
      timestamp: now,
      fetchedAt: fetchedAt,
    },
    // More varied readings
    {
      _id: "mock_9" as any,
      _creationTime: fetchedAt,
      stationId: "S121",
      stationName: "Woodlands",
      latitude: 1.44387,
      longitude: 103.78538,
      value: 21.3, // Heavy rain (red)
      timestamp: now,
      fetchedAt: fetchedAt,
    },
    {
      _id: "mock_10" as any,
      _creationTime: fetchedAt,
      stationId: "S111",
      stationName: "Pasir Ris",
      latitude: 1.37199,
      longitude: 103.95168,
      value: 6.7, // Light rain (green)
      timestamp: now,
      fetchedAt: fetchedAt,
    },
    {
      _id: "mock_11" as any,
      _creationTime: fetchedAt,
      stationId: "S115",
      stationName: "Tuas South",
      latitude: 1.28218,
      longitude: 103.61843,
      value: 15.4, // Moderate rain (yellow-orange)
      timestamp: now,
      fetchedAt: fetchedAt,
    },
    {
      _id: "mock_12" as any,
      _creationTime: fetchedAt,
      stationId: "S43",
      stationName: "Kim Chuan",
      latitude: 1.33746,
      longitude: 103.88924,
      value: 1.8, // Very light rain (blue)
      timestamp: now,
      fetchedAt: fetchedAt,
    },
  ];
}

/**
 * Query: Get rainfall data for a specific station
 *
 * Returns historical readings for a single station.
 */
export const getRainfallByStation = query({
  args: {
    stationId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const readings = await ctx.db
      .query("rainfall")
      .withIndex("by_station", (q) => q.eq("stationId", args.stationId))
      .order("desc")
      .take(limit);

    return readings;
  },
});

/**
 * Internal Action: Fetch and save rainfall data
 *
 * Calls external NEA API, processes response, and saves to database.
 * Triggered by cron job every 5 minutes.
 */
export const fetchAndSaveRainfall = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("=== Fetching rainfall data from NEA API ===");

    try {
      // Call NEA API directly (RainfallService is not available in Convex runtime)
      const apiUrl = "https://api-open.data.gov.sg/v2/real-time/api/rainfall";
      console.log(`Calling NEA API: ${apiUrl}`);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(
          `NEA API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      console.log(
        `API response code: ${data.code}, stations: ${data.data?.stations?.length}`,
      );

      if (data.code !== 0 || !data.data) {
        throw new Error(
          `NEA API returned error: ${data.errorMsg || "Unknown error"}`,
        );
      }

      // Extract stations and readings
      const stations = data.data.stations || [];
      const readings = data.data.readings || [];

      if (stations.length === 0 || readings.length === 0) {
        console.log("No stations or readings in API response");
        return { success: false, error: "No data available" };
      }

      // Create station lookup map
      interface StationInfo {
        name: string;
        latitude: number;
        longitude: number;
      }
      const stationMap = new Map<string, StationInfo>(
        stations.map(
          (s: {
            id: string;
            name: string;
            location: { latitude: number; longitude: number };
          }) => [
            s.id,
            {
              name: s.name,
              latitude: s.location.latitude,
              longitude: s.location.longitude,
            },
          ],
        ),
      );

      // Get the latest reading set (most recent timestamp)
      const latestReading = readings[0];
      if (!latestReading) {
        console.log("No readings found in API response");
        return { success: false, error: "No readings available" };
      }

      const timestamp = latestReading.timestamp;
      const fetchedAt = Date.now();

      // Process readings into database format
      const processedReadings = latestReading.data
        .map((reading: { stationId: string; value: number }) => {
          const station = stationMap.get(reading.stationId);
          if (!station) {
            console.warn(`Station not found: ${reading.stationId}`);
            return null;
          }

          return {
            stationId: reading.stationId,
            stationName: station.name,
            latitude: station.latitude,
            longitude: station.longitude,
            value: reading.value,
            timestamp: timestamp,
            fetchedAt: fetchedAt,
          };
        })
        .filter((r: unknown) => r !== null);

      console.log(
        `Processed ${processedReadings.length} readings for ${timestamp}`,
      );

      // Save to database (with batched operations)
      const api = await import("./_generated/api");
      await ctx.runMutation(api.internal.rainfall.saveRainfallData, {
        readings: processedReadings,
      });

      console.log("=== Rainfall data fetch completed successfully ===");
      return {
        success: true,
        timestamp,
        count: processedReadings.length,
      };
    } catch (error) {
      console.error("Error fetching rainfall data:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
