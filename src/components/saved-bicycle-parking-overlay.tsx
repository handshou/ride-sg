"use client";

import type { BicycleParkingResult } from "@/lib/schema/bicycle-parking.schema";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";

interface SavedBicycleParkingOverlayProps {
  map: mapboxgl.Map;
}

export function SavedBicycleParkingOverlay({
  map,
}: SavedBicycleParkingOverlayProps) {
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [, setUpdateTrigger] = useState(0);

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
              `<div style="padding: 8px;">
              <strong>💾 ${location.description}</strong><br/>
              <small>${location.rackType} • ${location.rackCount} racks</small><br/>
              <small style="color: #ef4444;">Saved Location</small>
            </div>`,
            ),
          )
          .addTo(map);

        markersRef.current.push(marker);
      }
    };

    // Render on mount
    renderSavedLocations();

    // Listen for changes to saved bicycle parking
    const handleSavedChanged = () => {
      renderSavedLocations();
      setUpdateTrigger((prev) => prev + 1);
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
