"use server";

import { Effect } from "effect";
import { LocationRepository } from "../repositories/location-repository";
import { runServerEffectAsync } from "../server-runtime";

const deleteLocationEffect = (locationId: string) =>
  Effect.gen(function* () {
    const repository = yield* LocationRepository;
    yield* repository.deleteLocation(locationId);
    yield* Effect.log(`Deleted location from database: ${locationId}`);

    return { success: true as const };
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError("Delete location failed", error);
        const errorMessage =
          error.cause instanceof Error
            ? error.cause.message
            : String(error.cause);

        return {
          success: false as const,
          error: errorMessage || "Failed to delete location",
        };
      }),
    ),
  );

/** Deletes a location through the configured location repository. */
export async function deleteLocationAction(
  locationId: string,
): Promise<{ success: boolean; error?: string }> {
  return await runServerEffectAsync(deleteLocationEffect(locationId));
}
