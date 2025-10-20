import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Convex Cron Jobs
 *
 * Scheduled background tasks that run automatically:
 * - Rainfall data fetch: Every 5 minutes from NEA Singapore API
 */

const crons = cronJobs();

/**
 * Fetch rainfall data every 5 minutes
 *
 * Keeps the database updated with the latest rainfall readings
 * from NEA Singapore's real-time rainfall API.
 */
crons.interval(
  "fetch-rainfall-data",
  { minutes: 5 },
  internal.rainfall.fetchAndSaveRainfall,
);

/**
 * Clean up old rainfall data once per day
 *
 * Removes rainfall data older than 2 days to keep the database efficient.
 * Runs at 3 AM daily.
 */
crons.daily(
  "cleanup-old-rainfall-data",
  { hourUTC: 3, minuteUTC: 0 },
  internal.rainfall.cleanupOldRainfallData,
);

export default crons;
