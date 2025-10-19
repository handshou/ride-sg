"use client";

import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";
import type { BicycleParkingResult } from "@/lib/schema/bicycle-parking.schema";

interface BicycleParkingOverlayProps {
  map: mapboxgl.Map;
  parkingLocations: BicycleParkingResult[];
}

/**
 * Bicycle Parking Overlay Component
 *
 * Renders green circular markers for bicycle parking locations.
 * - Marker size scales with rack count
 * - Different icon for sheltered parking
 */
export function BicycleParkingOverlay({
  map,
  parkingLocations,
}: BicycleParkingOverlayProps) {
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    // Clean up previous markers
    for (const marker of markersRef.current) {
      marker.remove();
    }
    markersRef.current = [];

    // Add new markers for each parking location
    for (const parking of parkingLocations) {
      // Determine marker size based on rack count
      const size =
        parking.rackCount <= 10 ? 8 : parking.rackCount <= 30 ? 12 : 16;

      // Create marker element
      const el = document.createElement("div");
      el.className = "bicycle-parking-marker";
      el.style.cssText = `
        width: ${size * 2}px;
        height: ${size * 2}px;
        background-color: ${parking.hasShelter ? "#10b981" : "#22c55e"};
        border: 2px solid white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${size}px;
        transition: transform 0.2s ease;
      `;

      // Add shelter icon if sheltered
      if (parking.hasShelter) {
        el.innerHTML = `<span style="color: white; font-size: ${size - 2}px;">🏠</span>`;
      }

      // Add hover effect
      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.2)";
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
      });

      // Create popup with parking details
      const popup = new mapboxgl.Popup({
        offset: size + 5,
        closeButton: false,
        className: "bicycle-parking-popup",
      }).setHTML(`
        <div style="padding: 8px; min-width: 200px;">
          <div style="font-weight: 600; margin-bottom: 4px; color: #1f2937;">
            ${parking.description}
          </div>
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
            ${parking.rackType}
          </div>
          <div style="font-size: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
            <span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 4px;">
              🚲 ${parking.rackCount} racks
            </span>
            ${
              parking.hasShelter
                ? '<span style="background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px;">🏠 Sheltered</span>'
                : '<span style="background: #9ca3af; color: white; padding: 2px 6px; border-radius: 4px;">No shelter</span>'
            }
          </div>
        </div>
      `);

      // Create and add marker
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([parking.longitude, parking.latitude])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    }

    // Cleanup function
    return () => {
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
    };
  }, [map, parkingLocations]);

  return null; // This component renders directly to the map
}
