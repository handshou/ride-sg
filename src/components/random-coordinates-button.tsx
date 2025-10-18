"use client";

import { Effect } from "effect";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateRandomCoordinatesEffect } from "@/lib/random-coordinates-service";

interface RandomCoordinatesButtonProps {
  onCoordinatesGenerated: (coords: {
    latitude: number;
    longitude: number;
  }) => void;
}

export function RandomCoordinatesButton({
  onCoordinatesGenerated,
}: RandomCoordinatesButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateRandomCoordinates = async () => {
    setIsGenerating(true);

    try {
      // Use the service-level Effect with proper error handling
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
      toast.success(
        `New coordinates generated: ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`,
      );
    } catch (error) {
      // Error is already handled in the Effect.catchAll above
      console.error("Random coordinate generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={generateRandomCoordinates}
      disabled={isGenerating}
      variant="outline"
      className="w-full bg-gray-900/95 text-white border-gray-700 hover:bg-gray-800/95 dark:bg-white/95 dark:text-gray-900 dark:border-gray-200 dark:hover:bg-gray-100/95"
    >
      {isGenerating ? (
        <>
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Generating...
        </>
      ) : (
        "🎲 Generate Random Coordinates"
      )}
    </Button>
  );
}
