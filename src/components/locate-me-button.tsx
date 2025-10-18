"use client";

import { Effect } from "effect";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getCurrentPositionEffect } from "@/lib/geolocation-service";

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
    } catch (error) {
      // Error is already handled in the Effect.catchAll above
      console.error("Location detection failed:", error);
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <Button
      onClick={locateMe}
      disabled={isLocating}
      variant="outline"
      className="w-full"
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
