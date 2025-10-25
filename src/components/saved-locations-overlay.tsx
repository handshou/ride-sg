"use client";

import { useQuery } from "convex/react";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";
import { logger } from "@/lib/client-logger";
import { useCityContext } from "@/hooks/use-city-context";
import { api } from "../../convex/_generated/api";

interface SavedLocationsOverlayProps {
  map: mapboxgl.Map;
}

export function SavedLocationsOverlay({ map }: SavedLocationsOverlayProps) {
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { city } = useCityContext();

  // Use Convex reactive query - automatically updates when data changes!
  // Filter by current city to only show saved locations for the active city
  // Returns undefined during SSR or when ConvexProvider is not available
  const locations = useQuery(api.locations.getRandomizableLocations, { city });

  // Reactively render markers whenever Convex data changes
  useEffect(() => {
    // Clear existing markers
    for (const marker of markersRef.current) {
      marker.remove();
    }
    markersRef.current = [];

    // If data is loading or empty, don't render anything
    if (!locations || locations.length === 0) {
      if (locations !== undefined) {
        logger.info("[SavedLocationsOverlay] No saved locations to display");
      }
      return;
    }

    logger.info(
      `[SavedLocationsOverlay] 🔄 Rendering ${locations.length} saved location pins (real-time update)`,
    );

    // Create native Mapbox pin marker for each saved location (blue color)
    for (const location of locations) {
      const marker = new mapboxgl.Marker({ color: "#3b82f6" }) // Blue pin
        .setLngLat([location.longitude, location.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
            <strong class="text-gray-900 dark:text-white">⭐ ${location.title}</strong><br/>
            <small class="text-gray-600 dark:text-gray-400">${location.description}</small><br/>
            <small class="text-blue-500 dark:text-blue-400">Saved for Sequential Navigation</small>
          </div>`,
          ),
        )
        .addTo(map);

      // Set z-index to appear above other markers but below UI panels (z-index 10-20)
      const markerElement = marker.getElement();
      if (markerElement) {
        markerElement.style.zIndex = "5";
      }

      markersRef.current.push(marker);
    }

    // Cleanup on re-render
    return () => {
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
    };
  }, [locations, map]); // Re-run whenever locations data changes from Convex!

  return null;
}
