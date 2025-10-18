"use client";

import { Button } from "@/components/ui/button";
import { getCurrentPositionEffect } from "@/lib/geolocation-service";
import { Effect } from "effect";
import { useState } from "react";
import { toast } from "sonner";

interface LocateMeButtonProps {
  onLocationFound: (coords: { latitude: number; longitude: number }) => void;
}

export function LocateMeButton({ onLocationFound }: LocateMeButtonProps) {
  const [isLocating, setIsLocating] = useState(false);

  const locateMe = async () => {
    setIsLocating(true);

    try {
      // Use the service-level Effect with proper error handling
      const result = await Effect.runPromise(
        getCurrentPositionEffect().pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Effect.logError("Failed to get current location", error);

              // Show specific error messages based on error type
              if (error.code === 1) {
                toast.error(
                  "Location access denied. Please enable location permissions.",
                );
              } else if (error.code === 2) {
                toast.error(
                  "Location unavailable. Please check your connection.",
                );
              } else if (error.code === 3) {
                toast.error("Location request timed out. Please try again.");
              } else {
                toast.error("Failed to get your location. Please try again.");
              }

              // Return fallback coordinates (Marina Bay, Singapore)
              return { latitude: 1.351616, longitude: 103.808053 };
            }),
          ),
        ),
      );

      // Success case
      onLocationFound(result);
      toast.success(
        `Location found: ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`,
      );
    } catch (_error) {
      // Error is already handled and logged in the Effect.catchAll above
      // No additional logging needed here
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <Button
      onClick={locateMe}
      disabled={isLocating}
      variant="outline"
      className="w-full bg-gray-900/95 text-white border-gray-700 hover:bg-gray-800/95 dark:bg-white/95 dark:text-gray-900 dark:border-gray-200 dark:hover:bg-gray-100/95"
    >
      {isLocating ? (
        <>
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Locating...
        </>
      ) : (
        "📍 Locate Me"
      )}
    </Button>
  );
}
