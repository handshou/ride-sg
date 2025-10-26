"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
 * Constant zoom level for zoom-out operation
 */
const ZOOM_OUT_LEVEL = 10;

/**
 * Flag emojis for each city
 */
const CITY_FLAGS = {
  singapore: "🇸🇬",
  jakarta: "🇮🇩",
} as const;

/**
 * City labels for display
 */
const _CITY_LABELS = {
  singapore: "Singapore",
  jakarta: "Jakarta",
} as const;

/**
 * City Toggle Button Component
 *
 * Displays a dropdown button with the current city's flag.
 * Menu shows both Singapore 🇸🇬 and Jakarta 🇮🇩.
 *
 * When clicking a city:
 * - Same city: Zooms out to constant level (10)
 * - Different city: Cross-border animation and city switch
 */
export function CityToggleButton({
  mapInstance,
  isMobile,
}: CityToggleButtonProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { city: currentCity, cityLabel, setCity } = useCityContext();

  const currentFlag = CITY_FLAGS[currentCity];

  const handleCitySelect = async (selectedCity: City) => {
    if (!mapInstance || isTransitioning) {
      logger.warn("Map not ready or already transitioning");
      return;
    }

    setIsTransitioning(true);

    try {
      if (selectedCity === currentCity) {
        // Same city: Zoom out to constant level
        const currentZoom = mapInstance.getZoom();
        const cityCenter = CITY_CENTERS[currentCity];

        logger.info(
          `Zooming out in ${currentCity}: ${currentZoom} → ${ZOOM_OUT_LEVEL}`,
        );

        await mapNavigation.flyTo(
          mapInstance,
          {
            coordinates: {
              latitude: cityCenter.latitude,
              longitude: cityCenter.longitude,
            },
            zoom: ZOOM_OUT_LEVEL,
            pitch: mapInstance.getPitch(),
            bearing: mapInstance.getBearing(),
            duration: 1000, // Quick zoom out
            curve: 1.2,
            easing: (t) => t * (2 - t),
            isMobile,
          },
          (error) => {
            logger.error("Failed to zoom out", error);
          },
        );

        logger.success(`Zoomed out to level ${ZOOM_OUT_LEVEL}`);
      } else {
        // Different city: Cross-border animation
        const targetCenter = CITY_CENTERS[selectedCity];
        logger.info(`Switching from ${currentCity} to ${selectedCity}`);

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
            duration: 6500, // 6.5 seconds for cross-border travel
            curve: 1.8, // High arc for dramatic effect
            easing: (t) => t * (2 - t),
            isMobile,
          },
          (error) => {
            logger.error("Failed to fly to target city", error);
          },
        );

        // Update city context (triggers re-render and navigation)
        logger.info(`Updating city context to ${selectedCity}`);
        setCity(selectedCity);

        logger.success(`Successfully switched to ${selectedCity}`);
      }
    } catch (error) {
      logger.error("Failed to handle city selection", error);
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          disabled={isTransitioning}
          data-testid="city-toggle-button"
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl w-10 h-10 p-0"
          aria-label={`Currently in ${cityLabel}. Click to view city options`}
          title={`City selector: ${cityLabel}`}
        >
          {isTransitioning ? (
            <span className="animate-pulse text-xl">✈️</span>
          ) : (
            <span className="text-xl">{currentFlag}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => handleCitySelect("singapore")}
          disabled={isTransitioning}
          className="cursor-pointer text-base"
        >
          <span className="text-xl mr-2">🇸🇬</span>
          <span>Singapore</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleCitySelect("jakarta")}
          disabled={isTransitioning}
          className="cursor-pointer text-base"
        >
          <span className="text-xl mr-2">🇮🇩</span>
          <span>Jakarta</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
