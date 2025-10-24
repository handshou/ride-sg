"use client";

import { Effect } from "effect";
import { Dices } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/client-logger";
import { generateRandomCoordinatesEffect } from "@/lib/services/random-coordinates-service";

interface RandomCoordinatesButtonProps {
  onCoordinatesGenerated: (coords: {
    latitude: number;
    longitude: number;
    title?: string;
    description?: string;
  }) => void;
  savedLocations?: Array<{
    latitude: number;
    longitude: number;
    title: string;
  }>;
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
}

export function RandomCoordinatesButton({
  onCoordinatesGenerated,
  savedLocations,
  currentIndex = 0,
  onIndexChange,
}: RandomCoordinatesButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateRandomCoordinates = async () => {
    setIsGenerating(true);

    try {
      // If we have saved locations, navigate sequentially through the shuffled list
      if (savedLocations && savedLocations.length > 0) {
        const location = savedLocations[currentIndex];
        const nextIndex = (currentIndex + 1) % savedLocations.length;

        logger.info(
          `Sequential navigation: ${currentIndex + 1}/${savedLocations.length} - "${location.title}"`,
        );
        logger.debug(
          `Next will be: ${nextIndex + 1}. "${savedLocations[nextIndex]?.title}"`,
        );

        onCoordinatesGenerated({
          ...location,
          description: `Saved location ${currentIndex + 1}/${savedLocations.length}`,
        });
        if (onIndexChange) {
          onIndexChange(nextIndex);
        }

        setIsGenerating(false);
        return;
      }

      logger.debug(
        "No saved locations, generating random Singapore coordinates",
      );

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
    } catch (_error) {
      // Error is already handled and logged in the Effect.catchAll above
      // No additional logging needed here
    } finally {
      setIsGenerating(false);
    }
  };

  const hasLocations = savedLocations && savedLocations.length > 0;
  const buttonTitle = hasLocations
    ? `Next Saved Location (${currentIndex + 1}/${savedLocations.length})`
    : "Random Singapore Location";

  return (
    <Button
      onClick={generateRandomCoordinates}
      disabled={isGenerating}
      variant="outline"
      size="icon"
      className="h-10 w-10 bg-white/95 text-gray-900 border-gray-300 hover:bg-gray-100/95 shadow-md dark:bg-gray-900/95 dark:text-white dark:border-gray-700 dark:hover:bg-gray-800/95"
      title={buttonTitle}
      data-testid="random-coordinates-button"
    >
      {isGenerating ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <Dices className="h-5 w-5" />
      )}
    </Button>
  );
}
