"use client";

import { logger } from "@/lib/client-logger";
import { toastNotifications } from "@/lib/toast-hook";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";

interface MapboxGLMapProps {
  center: [number, number];
  zoom: number;
  className?: string;
  accessToken: string;
  onMapReady?: (map: mapboxgl.Map) => void;
  style?: string;
}

export function MapboxGLMap({
  center,
  zoom,
  className = "",
  accessToken,
  onMapReady,
  style = "mapbox://styles/mapbox/streets-v12",
}: MapboxGLMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const currentStyleRef = useRef<string>(style);
  const [isLoaded, setIsLoaded] = useState(false);
  const lastErrorRef = useRef<string>("");

  // Store initial props in refs so they don't trigger re-initialization
  const initialPropsRef = useRef({
    center,
    zoom,
    accessToken,
    style,
    onMapReady,
  });

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    const {
      accessToken: token,
      center: initialCenter,
      zoom: initialZoom,
      style: initialStyle,
      onMapReady: callback,
    } = initialPropsRef.current;

    // Set Mapbox access token from props
    mapboxgl.accessToken = token;

    if (mapContainer.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: initialStyle,
        center: initialCenter,
        zoom: initialZoom,
        attributionControl: false,
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

      // Add fullscreen control
      map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

      // Add geolocate control
      map.current.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
          },
          trackUserLocation: true,
          showUserHeading: true,
        }),
        "top-right",
      );

      // Handle map load
      map.current.on("load", () => {
        setIsLoaded(true);
        if (callback && map.current) {
          callback(map.current);
        }
      });

      // Handle map errors with user-friendly toasts
      map.current.on("error", (e) => {
        const errorMessage = e.error?.message || "Unknown error";

        // Prevent duplicate toasts for the same error
        if (lastErrorRef.current === errorMessage) {
          logger.debug("Mapbox GL error (duplicate)", e);
          return;
        }
        lastErrorRef.current = errorMessage;

        // Token-related errors
        if (
          errorMessage.includes("secret access token") ||
          errorMessage.includes("sk.")
        ) {
          toastNotifications.error(
            "Invalid Mapbox token - please use a public token (pk.*)",
          );
        }
        // 403 Forbidden errors (token permissions/restrictions)
        else if (
          errorMessage.includes("Forbidden") ||
          errorMessage.includes("403")
        ) {
          toastNotifications.error(
            "Mapbox token forbidden - check token permissions and URL restrictions",
          );
        }
        // Tile loading errors
        else if (
          errorMessage.includes("tile") ||
          errorMessage.includes("Tile")
        ) {
          toastNotifications.warning(
            "Map tiles failed to load - check your internet connection",
          );
        }
        // Style loading errors
        else if (
          errorMessage.includes("style") ||
          errorMessage.includes("Style")
        ) {
          toastNotifications.error("Failed to load map style");
        }
        // Generic errors
        else {
          toastNotifications.error(
            "Map error occurred - see console for details",
          );
        }

        logger.error("Mapbox GL error", e);
      });
    }

    // Cleanup function - only runs when component unmounts
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initialize map only once - empty deps array

  // Handle style changes dynamically
  useEffect(() => {
    if (map.current && isLoaded && currentStyleRef.current !== style) {
      currentStyleRef.current = style;
      map.current.setStyle(style);
    }
  }, [style, isLoaded]);

  return (
    <div className={`relative ${className}`} data-testid="mapbox-gl-map">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Loading map...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
