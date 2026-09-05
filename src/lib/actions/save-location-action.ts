"use server";

import { Effect } from "effect";
import { LocationRepository } from "../repositories/location-repository";
import { runServerEffectAsync } from "../server-runtime";
import { ConfigService } from "../services/config-service";
import type { SearchResult } from "../services/search-state-service";
import { detectCityFromCoords } from "../utils/detect-location";

const saveLocationEffect = (result: SearchResult) =>
  Effect.gen(function* () {
    const config = yield* ConfigService;
    const repository = yield* LocationRepository;
    const detectedCity = yield* Effect.tryPromise({
      try: () =>
        detectCityFromCoords(
          result.location.latitude,
          result.location.longitude,
          config.mapbox.token,
        ),
      catch: (cause) => cause,
    });
    const city =
      detectedCity === "singapore" || detectedCity === "jakarta"
        ? detectedCity
        : "singapore";
    const postalCode = result.address?.match(/\b\d{6}\b/)?.[0];
    const savedLocation = yield* repository.saveLocation({
      title: result.title,
      description: result.description,
      latitude: result.location.latitude,
      longitude: result.location.longitude,
      source: result.source,
      timestamp: Date.now(),
      city,
      isRandomizable: true,
      postalCode,
    });

    yield* Effect.log(
      `Saved location to database: ${savedLocation.title} (${savedLocation.id})`,
    );
    return { success: true as const, id: savedLocation.id };
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError("Save location failed", error);
        const errorMessage =
          error && typeof error === "object" && "cause" in error
            ? String(error.cause)
            : error instanceof Error
              ? error.message
              : String(error);

        return {
          success: false as const,
          error: errorMessage || "Failed to save location",
        };
      }),
    ),
  );

/** Saves or replaces a location through the configured location repository. */
export async function saveLocationAction(
  result: SearchResult,
): Promise<{ success: boolean; error?: string; id?: string }> {
  return await runServerEffectAsync(saveLocationEffect(result));
}
