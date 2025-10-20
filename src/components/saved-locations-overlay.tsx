"use client";

import { ConvexHttpClient } from "convex/browser";
import { Effect } from "effect";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";
import { logger } from "@/lib/client-logger";
import { convexPublicDeploymentConfig } from "@/lib/services/config-service";
import { api } from "../../convex/_generated/api";

interface SavedLocationsOverlayProps {
  map: mapboxgl.Map;
}

interface SavedLocation {
  _id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  source: "mapbox" | "exa" | "database";
  timestamp: number;
  isRandomizable?: boolean;
}

export function SavedLocationsOverlay({ map }: SavedLocationsOverlayProps) {
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    // Function to load and render saved locations from Convex
    const renderSavedLocations = async () => {
      // Clear existing markers
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];

      try {
        // Use Effect config service to get Convex URL
        const deployment = await Effect.runPromise(
          convexPublicDeploymentConfig,
        );
        if (!deployment) {
          logger.warn("NEXT_PUBLIC_CONVEX_URL not configured");
          return;
        }

        const client = new ConvexHttpClient(deployment);
        const locations = (await client.query(
          api.locations.getRandomizableLocations,
          {},
        )) as SavedLocation[];

        logger.info(
          `📍 Rendering ${locations.length} saved location pins on map`,
        );

        // Create native Mapbox pin marker for each saved location (blue color)
        for (const location of locations) {
          const marker = new mapboxgl.Marker({ color: "#3b82f6" }) // Blue pin
            .setLngLat([location.longitude, location.latitude])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(
                `<div style="padding: 8px;">
                <strong>⭐ ${location.title}</strong><br/>
                <small>${location.description}</small><br/>
                <small style="color: #3b82f6;">Saved for Sequential Navigation</small>
              </div>`,
              ),
            )
            .addTo(map);

          markersRef.current.push(marker);
        }
      } catch (error) {
        logger.error("Failed to render saved locations", error);
      }
    };

    // Render on mount
    renderSavedLocations();

    // Listen for changes to saved locations
    const handleLocationSaved = () => {
      logger.info("Location saved, re-rendering location pins...");
      setTimeout(() => renderSavedLocations(), 1000); // Wait 1s for Convex to sync
    };

    window.addEventListener("locationSaved", handleLocationSaved);

    // Cleanup
    return () => {
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
      window.removeEventListener("locationSaved", handleLocationSaved);
    };
  }, [map]);

  return null;
}
