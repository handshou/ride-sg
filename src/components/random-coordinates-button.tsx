"use client";

import { Button } from "@/components/ui/button";
import { generateRandomCoordinatesEffect } from "@/lib/services/random-coordinates-service";
import { Effect } from "effect";
import { Dices } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface RandomCoordinatesButtonProps {
  onCoordinatesGenerated: (coords: {
    latitude: number;
    longitude: number;
  }) => void;
  savedLocations?: Array<{ latitude: number; longitude: number }>;
}

export function RandomCoordinatesButton({
  onCoordinatesGenerated,
  savedLocations,
}: RandomCoordinatesButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateRandomCoordinates = async () => {
    setIsGenerating(true);

    try {
      // If we have saved locations, pick one randomly
      if (savedLocations && savedLocations.length > 0) {
        const randomIndex = Math.floor(Math.random() * savedLocations.length);
        const randomLocation = savedLocations[randomIndex];

        onCoordinatesGenerated(randomLocation);
        toast.success("Navigating to saved location");
        setIsGenerating(false);
        return;
      }

      // Fall back to random Singapore coordinates
      const result = await Effect.runPromise(
        generateRandomCoordinatesEffect().pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Effect.logError(
                "Failed to generate random coordinates",
                error,
              );
              toast.error(
                "Failed to generate random coordinates. Please try again.",
              );
              // Return fallback coordinates
              return { latitude: 1.351616, longitude: 103.808053 };
            }),
          ),
        ),
      );

      // Success case
      onCoordinatesGenerated(result);
      toast.success("New random coordinates generated");
    } catch (_error) {
      // Error is already handled and logged in the Effect.catchAll above
      // No additional logging needed here
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={generateRandomCoordinates}
      disabled={isGenerating}
      variant="outline"
      size="icon"
      className="h-10 w-10 bg-white/95 text-gray-900 border-gray-300 hover:bg-gray-100/95 shadow-md dark:bg-gray-900/95 dark:text-white dark:border-gray-700 dark:hover:bg-gray-800/95"
      title="Generate random coordinates"
    >
      {isGenerating ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <Dices className="h-5 w-5" />
      )}
    </Button>
  );
}
