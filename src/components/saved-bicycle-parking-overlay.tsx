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
      for (let i = 0; i < savedLocations.length; i++) {
        const location = savedLocations[i];
        const locationKey = `${location.latitude},${location.longitude}`;

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div class="p-2">
            <strong class="text-gray-900 dark:text-white">💾 ${location.description}</strong><br/>
            <small class="text-gray-600 dark:text-gray-400">${location.rackType} • ${location.rackCount} racks</small><br/>
            <button 
              onclick="window.removeSavedBicycleParking('${locationKey}')"
              class="mt-2 text-xs px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded dark:bg-red-600 dark:hover:bg-red-700"
            >
              Remove
            </button>
          </div>`,
        );

        const marker = new mapboxgl.Marker({ color: "#ef4444" }) // Red pin
          .setLngLat([location.longitude, location.latitude])
          .setPopup(popup)
          .addTo(map);

        // Set z-index to appear above bicycle icons but below UI panels
        const markerElement = marker.getElement();
        if (markerElement) {
          markerElement.style.zIndex = "4";
        }

        markersRef.current.push(marker);
      }

      // Add global function to remove saved bicycle parking
      if (typeof window !== "undefined") {
        (window as any).removeSavedBicycleParking = (locationKey: string) => {
          const savedLocations: BicycleParkingResult[] = JSON.parse(
            localStorage.getItem("savedBicycleParkingLocations") || "[]",
          );

          const [lat, lng] = locationKey.split(",").map(Number);
          const filtered = savedLocations.filter(
            (loc) => loc.latitude !== lat || loc.longitude !== lng,
          );

          localStorage.setItem(
            "savedBicycleParkingLocations",
            JSON.stringify(filtered),
          );

          // Trigger re-render
          window.dispatchEvent(new Event("savedBicycleParkingChanged"));
        };
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
