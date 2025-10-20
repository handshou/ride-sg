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
    console.log(`Saving ${args.readings.length} rainfall readings...`);

    // Clear old readings for the same timestamp to prevent duplicates
    if (args.readings.length > 0) {
      const timestamp = args.readings[0].timestamp;
      const existingReadings = await ctx.db
        .query("rainfall")
        .withIndex("by_timestamp", (q) => q.eq("timestamp", timestamp))
        .collect();

      for (const reading of existingReadings) {
        await ctx.db.delete(reading._id);
      }
      console.log(
        `Cleared ${existingReadings.length} old readings for ${timestamp}`,
      );
    }

    // Insert new readings
    let insertCount = 0;
    for (const reading of args.readings) {
      await ctx.db.insert("rainfall", reading);
      insertCount++;
    }

    console.log(`Successfully saved ${insertCount} rainfall readings`);
    return { success: true, count: insertCount };
  },
});

/**
 * Query: Get latest rainfall data for all stations
 *
 * Returns the most recent set of rainfall readings.
 * Used by client components for real-time visualization.
 */
export const getLatestRainfall = query({
  args: {},
  handler: async (ctx) => {
    // Get the most recent fetchedAt timestamp
    const allReadings = await ctx.db
      .query("rainfall")
      .withIndex("by_fetched")
      .order("desc")
      .take(100); // Get recent readings

    if (allReadings.length === 0) {
      return [];
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

      // Save to database
      await ctx.runMutation(internal.rainfall.saveRainfallData, {
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

// Import the internal API for internal use
import { internal } from "./_generated/api";
