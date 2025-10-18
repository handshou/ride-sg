"use client";

import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

interface MapboxSimpleOverlayProps {
  map: mapboxgl.Map | null;
  coordinates: { latitude: number; longitude: number } | null;
  isUserLocation?: boolean;
}

export function MapboxSimpleOverlay({
  map,
  coordinates,
  isUserLocation = false,
}: MapboxSimpleOverlayProps) {
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!map || !coordinates) return;

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    // Create a custom marker element
    const markerElement = document.createElement("div");
    markerElement.className = "location-marker";
    markerElement.innerHTML = `
      <div style="
        width: 20px;
        height: 20px;
        background: ${isUserLocation ? '#3b82f6' : '#10b981'};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        animation: pulse 2s infinite;
      "></div>
    `;

    // Add CSS animation if not already added
    if (!document.getElementById("location-marker-styles")) {
      const style = document.createElement("style");
      style.id = "location-marker-styles";
      style.textContent = `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    // Create marker
    const marker = new mapboxgl.Marker({
      element: markerElement,
      anchor: "center",
    })
      .setLngLat([coordinates.longitude, coordinates.latitude])
      .addTo(map);

    markerRef.current = marker;

    // Cleanup function
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [map, coordinates?.latitude, coordinates?.longitude, isUserLocation]);

  return null;
}
