import { Effect } from "effect";
import { NextResponse } from "next/server";
import { runServerEffectAsync } from "@/lib/server-runtime";
import { BicycleParkingService } from "@/lib/services/bicycle-parking-service";

/**
 * GET /api/bicycle-parking
 *
 * Fetches bicycle parking locations near the provided coordinates
 *
 * Query params:
 * - lat: latitude
 * - long: longitude
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const long = searchParams.get("long");

    if (!lat || !long) {
      return NextResponse.json(
        { error: "Missing required parameters: lat, long" },
        { status: 400 },
      );
    }

    const latitude = Number.parseFloat(lat);
    const longitude = Number.parseFloat(long);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return NextResponse.json(
        { error: "Invalid coordinates format" },
        { status: 400 },
      );
    }

    // Validate Singapore bounds
    if (
      latitude < 1.15 ||
      latitude > 1.48 ||
      longitude < 103.6 ||
      longitude > 104.1
    ) {
      return NextResponse.json(
        { error: "Coordinates must be within Singapore bounds" },
        { status: 400 },
      );
    }

    // Fetch bicycle parking using Effect service
    const program = Effect.gen(function* () {
      const bicycleParkingService = yield* BicycleParkingService;
      const results = yield* bicycleParkingService.fetchNearbyParking(
        latitude,
        longitude,
      );
      return results;
    });

    // Run on the shared server runtime so the cache repository and
    // connection pool are reused across requests
    const results = await runServerEffectAsync(program);

    return NextResponse.json({
      results,
      query: { latitude, longitude },
      count: results.length,
    });
  } catch (error) {
    console.error("Bicycle parking API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch bicycle parking data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
