"use client";

import { ErrorToastHandler } from "@/components/error-toast-handler";
import { LocateMeButton } from "@/components/locate-me-button";
import { MapStyleSelector } from "@/components/map-style-selector";
import { MapboxGLMap } from "@/components/mapbox-gl-map";
import { MapboxSimpleOverlay } from "@/components/mapbox-simple-overlay";
import { RandomCoordinatesButton } from "@/components/random-coordinates-button";
import { SearchPanel } from "@/components/search-panel";
import { MAPBOX_STYLES } from "@/lib/map-styles";
import type { GeocodeResult } from "@/lib/mapbox-service";
import type { SearchResult } from "@/lib/search-state-service";
import { useTheme } from "next-themes";
import { useCallback, useRef, useState } from "react";

interface SingaporeMapExplorerProps {
  initialRandomCoords: { latitude: number; longitude: number };
  singaporeLocations: GeocodeResult[];
  currentLocation: GeocodeResult[];
  staticMapUrl: string;
  mapboxPublicToken: string;
}

export function SingaporeMapExplorer({
  initialRandomCoords,
  singaporeLocations,
  currentLocation,
  staticMapUrl,
  mapboxPublicToken,
}: SingaporeMapExplorerProps) {
  const { theme } = useTheme();
  const [randomCoords, setRandomCoords] = useState(initialRandomCoords);
  const [staticMapUrlState, setStaticMapUrlState] = useState(staticMapUrl);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapLocation, setMapLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(initialRandomCoords);
  const [isUserLocation, setIsUserLocation] = useState(false);

  // Get the appropriate map style based on theme
  const getMapStyleForTheme = (currentTheme: string | undefined) => {
    if (currentTheme === "dark") {
      return MAPBOX_STYLES.dark;
    }
    return MAPBOX_STYLES.light;
  };

  const [mapStyle, setMapStyle] = useState(getMapStyleForTheme(theme));

  const handleMapReady = useCallback(
    (map: mapboxgl.Map) => {
      mapInstanceRef.current = map;
      setIsMapReady(true);

      // Fly to initial location with a gentle animation
      console.log("🗺️ Map ready, flying to initial location");
      map.flyTo({
        center: [initialRandomCoords.longitude, initialRandomCoords.latitude],
        zoom: 13,
        duration: 1500,
        essential: true,
        curve: 1.2,
        easing: (t) => t * (2 - t),
      });
    },
    [initialRandomCoords],
  );

  const handleCoordinatesGenerated = useCallback(
    (newCoords: { latitude: number; longitude: number }) => {
      // Update static map URL with new coordinates
      const newStaticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${newCoords.longitude},${newCoords.latitude},12/400x300?access_token=${mapboxPublicToken}`;
      setStaticMapUrlState(newStaticMapUrl);

      // Fly to new random coordinates with smooth animation (no pitch/bearing)
      if (mapInstanceRef.current) {
        const map = mapInstanceRef.current;

        const executeFlyTo = () => {
          map.flyTo({
            center: [newCoords.longitude, newCoords.latitude],
            zoom: 14,
            duration: 1500,
            essential: true,
            curve: 1.2,
            easing: (t) => t * (2 - t),
          });

          // Update state after flyTo starts
          setRandomCoords(newCoords);
          setMapLocation(newCoords);
          setIsUserLocation(false);
        };

        if (!map.isStyleLoaded()) {
          map.once("styledata", executeFlyTo);
        } else {
          executeFlyTo();
        }
      }
    },
    [mapboxPublicToken],
  );

  const handleLocationFound = useCallback(
    (coords: { latitude: number; longitude: number }) => {
      // Update static map URL with new coordinates
      const newStaticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${coords.longitude},${coords.latitude},12/400x300?access_token=${mapboxPublicToken}`;
      setStaticMapUrlState(newStaticMapUrl);

      // Fly to user's location with smooth animation (no pitch/bearing)
      if (mapInstanceRef.current) {
        const map = mapInstanceRef.current;

        const executeFlyTo = () => {
          map.flyTo({
            center: [coords.longitude, coords.latitude],
            zoom: 16,
            duration: 1800,
            essential: true,
            curve: 1.3,
            easing: (t) => t * (2 - t),
          });

          // Update state after flyTo starts
          setRandomCoords(coords);
          setMapLocation(coords);
          setIsUserLocation(true);
        };

        if (!map.isStyleLoaded()) {
          map.once("styledata", executeFlyTo);
        } else {
          executeFlyTo();
        }
      }
    },
    [mapboxPublicToken],
  );

  // Handle map style changes
  const handleStyleChange = useCallback((newStyle: string) => {
    setMapStyle(newStyle);
  }, []);

  // Handle search result selection - flyTo the selected location
  const handleSearchResultSelect = useCallback((result: SearchResult) => {
    console.log("🔍 Search result selected:", result.title, result.location);

    // Fly to the search result with cinematic animation
    if (mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      const currentCenter = map.getCenter();

      console.log(
        "✈️ Current map center:",
        currentCenter.lng,
        currentCenter.lat,
      );
      console.log(
        "✈️ Flying to:",
        result.location.longitude,
        result.location.latitude,
      );

      // Function to execute flyTo
      const executeFlyTo = () => {
        map.flyTo({
          center: [result.location.longitude, result.location.latitude],
          zoom: 17, // Zoom in very close for POIs
          duration: 2500, // 2.5 second cinematic animation
          essential: true,
          curve: 1.6, // High arc for sweeping motion
          easing: (t) => {
            // Custom easing: slow start, fast middle, slow end
            return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
          },
          pitch: 50, // Tilt for dramatic 3D view
          bearing: 30, // Slight rotation for visual interest
        });
        console.log("✅ flyTo called successfully");

        // Update marker location AFTER flyTo starts (to avoid re-render before animation)
        setMapLocation(result.location);
        setIsUserLocation(false);
      };

      // If map style is still loading, wait for it to finish
      if (!map.isStyleLoaded()) {
        console.log("⏳ Map style loading, waiting for 'styledata' event...");
        map.once("styledata", () => {
          console.log("✅ Map style loaded, executing flyTo");
          executeFlyTo();
        });
      } else {
        executeFlyTo();
      }
    } else {
      console.warn("⚠️ Map instance not ready yet");
    }
  }, []);

  return (
    <div className="font-sans min-h-screen">
      <ErrorToastHandler
        singaporeLocationsCount={singaporeLocations.length}
        currentLocationCount={currentLocation.length}
        staticMapUrl={staticMapUrlState}
      />

      {/* Header with map style selector */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <MapStyleSelector onStyleChange={handleStyleChange} />
        {/* <ThemeToggle /> */}
      </div>

      {/* Search Panel */}
      <SearchPanel onResultSelect={handleSearchResultSelect} />

      {/* Main Interactive Map */}
      <div className="relative w-full h-screen">
        <MapboxGLMap
          center={[randomCoords.longitude, randomCoords.latitude]}
          zoom={12}
          className="w-full h-full"
          accessToken={mapboxPublicToken}
          onMapReady={handleMapReady}
          style={mapStyle}
        />
        {isMapReady && mapInstanceRef.current && mapLocation && (
          <MapboxSimpleOverlay
            key={`${mapLocation.latitude}-${mapLocation.longitude}-${isUserLocation}`}
            map={mapInstanceRef.current}
            coordinates={mapLocation}
            isUserLocation={isUserLocation}
          />
        )}
      </div>

      {/* Floating Controls */}
      <div className="absolute bottom-4 left-4 z-10 space-y-2">
        <RandomCoordinatesButton
          onCoordinatesGenerated={handleCoordinatesGenerated}
        />
        <LocateMeButton onLocationFound={handleLocationFound} />
      </div>

      {/* Coordinates Display */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="bg-gray-900/95 dark:bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg text-right border border-gray-700 dark:border-gray-200">
          <div className="text-sm font-medium text-white dark:text-gray-900">
            {isUserLocation ? "Your Location" : "Random Location"}
          </div>
          <div className="text-xs text-gray-300 dark:text-gray-600">
            {randomCoords.latitude.toFixed(6)},{" "}
            {randomCoords.longitude.toFixed(6)}
          </div>
        </div>
      </div>
    </div>
  );
}
