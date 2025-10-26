"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/client-logger";
import { mapNavigation } from "@/lib/services/map-navigation-service";
import { useCityContext } from "@/providers/city-provider";

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
 * Displays a button with the current city's flag.
 * Positioned in the top-right corner above the search bar for mobile visibility.
 * When clicked:
 * 1. Flies to the center of the opposite city
 * 2. Updates city context (triggers re-render of all city-aware components)
 */
export function CityToggleButton({
  mapInstance,
  isMobile,
}: CityToggleButtonProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { city: currentCity, cityLabel, setCity } = useCityContext();

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
      // Fly to target city center with dramatic cross-border animation
      await mapNavigation.flyTo(
        mapInstance,
        {
          coordinates: {
            latitude: targetCenter.latitude,
            longitude: targetCenter.longitude,
          },
          zoom: isMobile ? 9 : targetCenter.zoom,
          pitch: 60,
          bearing: 0,
          duration: 6500, // 6.5 seconds for cross-border travel (matches CrossBorderNavigationService)
          curve: 1.8, // High arc for dramatic effect
          easing: (t) => t * (2 - t),
          isMobile,
        },
        (error) => {
          logger.error("Failed to fly to target city", error);
        },
      );

      // Update city context (triggers re-render and navigation)
      logger.info(`Updating city context to ${targetCity}`);
      setCity(targetCity);

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
      size="sm"
      onClick={handleToggle}
      disabled={isTransitioning}
      className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl text-xl sm:text-2xl px-2 sm:px-3 py-1 sm:py-2 h-auto"
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
