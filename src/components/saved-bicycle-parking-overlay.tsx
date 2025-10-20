"use client";

import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";
import type { BicycleParkingResult } from "@/lib/schema/bicycle-parking.schema";

interface SavedBicycleParkingOverlayProps {
  map: mapboxgl.Map;
}

export function SavedBicycleParkingOverlay({
  map,
}: SavedBicycleParkingOverlayProps) {
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    // Function to load and render saved bicycle parking
    const renderSavedLocations = () => {
      // Clear existing markers
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];

      // Load saved bicycle parking from localStorage
      if (typeof window === "undefined") return;

      const savedLocations: BicycleParkingResult[] = JSON.parse(
        localStorage.getItem("savedBicycleParkingLocations") || "[]",
      );

      // Create native Mapbox pin marker for each saved location (red color)
      for (const location of savedLocations) {
        const marker = new mapboxgl.Marker({ color: "#ef4444" }) // Red pin
          .setLngLat([location.longitude, location.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<div class="p-2">
              <strong class="text-gray-900 dark:text-white">💾 ${location.description}</strong><br/>
              <small class="text-gray-600 dark:text-gray-400">${location.rackType} • ${location.rackCount} racks</small><br/>
              <small class="text-red-500 dark:text-red-400">Saved Location</small>
            </div>`,
            ),
          )
          .addTo(map);

        // Set z-index to appear above bicycle icons but below blue saved location pins
        const markerElement = marker.getElement();
        if (markerElement) {
          markerElement.style.zIndex = "90";
        }

        markersRef.current.push(marker);
      }
    };

    // Render on mount
    renderSavedLocations();

    // Listen for changes to saved bicycle parking
    const handleSavedChanged = () => {
      renderSavedLocations();
    };

    window.addEventListener("savedBicycleParkingChanged", handleSavedChanged);

    // Cleanup
    return () => {
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
      window.removeEventListener(
        "savedBicycleParkingChanged",
        handleSavedChanged,
      );
    };
  }, [map]);

  return null;
}
