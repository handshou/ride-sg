import { Effect, Schema } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import {
  LocationCitySchema,
  LocationRepository,
} from "@/lib/repositories/location-repository";
import { runServerEffectAsync } from "@/lib/server-runtime";

/** Returns randomizable saved locations from the configured repository. */
export async function GET(request: NextRequest) {
  const cityResult = Schema.decodeUnknownEither(LocationCitySchema)(
    request.nextUrl.searchParams.get("city"),
  );

  if (cityResult._tag === "Left") {
    return NextResponse.json(
      { error: "Location list requires city=singapore or city=jakarta" },
      { status: 400 },
    );
  }

  try {
    const locations = await runServerEffectAsync(
      Effect.flatMap(LocationRepository, (repository) =>
        repository.listRandomizableLocations(cityResult.right),
      ),
    );
    return NextResponse.json({ locations });
  } catch (error) {
    console.error("Location list request failed", error);
    return NextResponse.json(
      { error: "Failed to load saved locations" },
      { status: 500 },
    );
  }
}
