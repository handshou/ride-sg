"use client";

import { Schema } from "effect";
import { useCallback, useEffect, useState } from "react";
import { logger } from "@/lib/client-logger";
import {
  type LocationCity,
  type LocationRecord,
  LocationRecordSchema,
} from "@/lib/repositories/location-repository";

const RandomizableLocationsResponseSchema = Schema.Struct({
  locations: Schema.Array(LocationRecordSchema),
});

/** Browser event emitted after saved location data changes. */
export const SAVED_LOCATIONS_CHANGED_EVENT = "ride-sg:saved-locations-changed";

/** Notifies location hooks to refresh after a save or delete operation. */
export function notifySavedLocationsChanged(): void {
  window.dispatchEvent(new Event(SAVED_LOCATIONS_CHANGED_EVENT));
}

/** Loads randomizable locations without exposing a database client to React. */
export function useRandomizableLocations(
  city: LocationCity,
): ReadonlyArray<LocationRecord> | undefined {
  const [locations, setLocations] = useState<
    ReadonlyArray<LocationRecord> | undefined
  >(undefined);

  const refreshLocations = useCallback(async () => {
    try {
      const response = await fetch(`/api/locations?city=${city}`);
      if (!response.ok) {
        throw new Error(`Location list returned HTTP ${response.status}`);
      }

      const payload = Schema.decodeUnknownSync(
        RandomizableLocationsResponseSchema,
      )(await response.json());
      setLocations(payload.locations);
    } catch (error) {
      logger.error("Saved location refresh failed", error);
      setLocations([]);
    }
  }, [city]);

  useEffect(() => {
    setLocations(undefined);
    void refreshLocations();

    const refresh = () => void refreshLocations();
    window.addEventListener(SAVED_LOCATIONS_CHANGED_EVENT, refresh);
    const pollingInterval = window.setInterval(refresh, 30_000);

    return () => {
      window.removeEventListener(SAVED_LOCATIONS_CHANGED_EVENT, refresh);
      window.clearInterval(pollingInterval);
    };
  }, [refreshLocations]);

  return locations;
}
