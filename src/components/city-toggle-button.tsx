"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/client-logger";
import { useCityContext } from "@/hooks/use-city-context";

export type City = "singapore" | "jakarta";

interface CityToggleButtonProps {
  mapInstance: mapboxgl.Map | null;
  isMobile: boolean;
}

/**
 * City center coordinates for flyTo navigation
 */
const CITY_CENTERS = {
  singapore: { latitude: 1.3521, longitude: 103.8198, zoom: 12 },
  jakarta: { latitude: -6.2088, longitude: 106.8456, zoom: 12 },
} as const;

/**
 * Flag emojis for each city
 */
const CITY_FLAGS = {
  singapore: "🇸🇬",
  jakarta: "🇮🇩",
} as const;

/**
 * City Toggle Button Component
 *
 * Displays a button with the current city's flag in the bottom right corner.
 * Shows which city you're currently viewing.
 * When clicked:
 * 1. Flies to the center of the opposite city
 * 2. Updates the URL using window.history.pushState (no page reload)
 */
export function CityToggleButton({
  mapInstance,
  isMobile,
}: CityToggleButtonProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { city: currentCity, cityLabel } = useCityContext();

  const targetCity = currentCity === "singapore" ? "jakarta" : "singapore";
  const targetCityLabel = targetCity === "singapore" ? "Singapore" : "Jakarta";
  const currentFlag = CITY_FLAGS[currentCity];
  const targetCenter = CITY_CENTERS[targetCity];

  const handleToggle = async () => {
    if (!mapInstance || isTransitioning) {
      logger.warn("Map not ready or already transitioning");
      return;
    }

    setIsTransitioning(true);
    logger.info(`Switching from ${currentCity} to ${targetCity}`);

    try {
      // Stop any ongoing animations
      mapInstance.stop();

      // Fly to target city center with dramatic animation
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          mapInstance.flyTo({
            center: [targetCenter.longitude, targetCenter.latitude],
            zoom: isMobile ? 9 : targetCenter.zoom,
            pitch: 60,
            bearing: 0,
            duration: 3500, // 3.5 seconds for cross-border travel
            essential: true,
            curve: 1.8, // High arc for dramatic effect
            easing: (t) => t * (2 - t),
          });

          // Wait for animation to complete
          setTimeout(resolve, 3500);
        });
      });

      // Update URL using window.history.pushState (no page reload, no rerender)
      logger.info(`Updating URL to /${targetCity} (no rerender)`);
      window.history.pushState({}, "", `/${targetCity}`);

      logger.success(`Successfully switched to ${targetCity}`);
    } catch (error) {
      logger.error("Failed to switch cities", error);
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={handleToggle}
      disabled={isTransitioning}
      className="fixed bottom-4 right-4 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl text-2xl sm:text-3xl px-3 sm:px-4 py-2 sm:py-3 h-auto"
      aria-label={`Currently in ${cityLabel}, click to switch to ${targetCityLabel}`}
      title={`Currently viewing ${cityLabel}. Click to switch to ${targetCityLabel}`}
    >
      {isTransitioning ? (
        <span className="animate-pulse">✈️</span>
      ) : (
        <span>{currentFlag}</span>
      )}
    </Button>
  );
}
