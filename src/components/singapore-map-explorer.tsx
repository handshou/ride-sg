"use client";

import { ErrorToastHandler } from "@/components/error-toast-handler";
import { LocateMeButton } from "@/components/locate-me-button";
import { MapStyleSelector } from "@/components/map-style-selector";
import { MapboxGLMap } from "@/components/mapbox-gl-map";
import { MapboxSimpleOverlay } from "@/components/mapbox-simple-overlay";
import { RandomCoordinatesButton } from "@/components/random-coordinates-button";
import { SearchPanel } from "@/components/search-panel";
import { ThemeToggle } from "@/components/theme-toggle";
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
    switch (currentTheme) {
      case "dark":
        return MAPBOX_STYLES.dark;
      case "light":
      case "system":
      default:
        return MAPBOX_STYLES.light;
    }
  };

  const [mapStyle, setMapStyle] = useState(getMapStyleForTheme(theme));

  const handleMapReady = useCallback((map: mapboxgl.Map) => {
    mapInstanceRef.current = map;
    setIsMapReady(true);
  }, []);

  const handleCoordinatesGenerated = useCallback(
    (newCoords: { latitude: number; longitude: number }) => {
      setRandomCoords(newCoords);
      setMapLocation(newCoords);
      setIsUserLocation(false);
      // Update static map URL with new coordinates
      const newStaticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${newCoords.longitude},${newCoords.latitude},12/400x300?access_token=${mapboxPublicToken}`;
      setStaticMapUrlState(newStaticMapUrl);

      // Update map center if map is ready
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo({
          center: [newCoords.longitude, newCoords.latitude],
          zoom: 12,
          duration: 1000,
        });
      }
    },
    [mapboxPublicToken],
  );

  const handleLocationFound = useCallback(
    (coords: { latitude: number; longitude: number }) => {
      setRandomCoords(coords);
      setMapLocation(coords);
      setIsUserLocation(true);
      // Update static map URL with new coordinates
      const newStaticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${coords.longitude},${coords.latitude},12/400x300?access_token=${mapboxPublicToken}`;
      setStaticMapUrlState(newStaticMapUrl);

      // Update map center if map is ready
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo({
          center: [coords.longitude, coords.latitude],
          zoom: 12,
          duration: 1000,
        });
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
    setMapLocation(result.location);
    setIsUserLocation(false);

    // Fly to the search result on the map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [result.location.longitude, result.location.latitude],
        zoom: 15, // Zoom in closer for search results
        duration: 2000, // Slower animation for search results
        essential: true,
      });
    }
  }, []);

  return (
    <div className="font-sans min-h-screen">
      <ErrorToastHandler
        singaporeLocationsCount={singaporeLocations.length}
        currentLocationCount={currentLocation.length}
        staticMapUrl={staticMapUrlState}
      />

      {/* Header with map style selector and theme toggle */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <MapStyleSelector onStyleChange={handleStyleChange} />
        <ThemeToggle />
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
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm p-3 rounded-lg shadow-lg text-right">
          <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {isUserLocation ? "Your Location" : "Random Location"}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {randomCoords.latitude.toFixed(6)},{" "}
            {randomCoords.longitude.toFixed(6)}
          </div>
        </div>
      </div>
    </div>
  );
}
