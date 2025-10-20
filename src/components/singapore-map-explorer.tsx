"use client";

import { BicycleParkingOverlay } from "@/components/bicycle-parking-overlay";
import { BicycleParkingPanel } from "@/components/bicycle-parking-panel";
import { ErrorToastHandler } from "@/components/error-toast-handler";
import { HowToButton } from "@/components/how-to-button";
import { LocateMeButton } from "@/components/locate-me-button";
import { MapStyleSelector } from "@/components/map-style-selector";
import { MapboxGLMap } from "@/components/mapbox-gl-map";
import { MapboxSimpleOverlay } from "@/components/mapbox-simple-overlay";
import { RainfallHeatMapOverlay } from "@/components/rainfall-heat-map-overlay";
import { RainfallMockToggleButton } from "@/components/rainfall-mock-toggle-button";
import { RainfallPanel } from "@/components/rainfall-panel";
import { RainfallToggleButton } from "@/components/rainfall-toggle-button";
import { RandomCoordinatesButton } from "@/components/random-coordinates-button";
import { SavedBicycleParkingOverlay } from "@/components/saved-bicycle-parking-overlay";
import { SavedLocationsOverlay } from "@/components/saved-locations-overlay";
import { SearchPanel } from "@/components/search-panel";
import { useMobile } from "@/hooks/use-mobile";
import { logger } from "@/lib/client-logger";
import { MAPBOX_STYLES } from "@/lib/map-styles";
import type { BicycleParkingResult } from "@/lib/schema/bicycle-parking.schema";
import type { GeocodeResult } from "@/lib/services/mapbox-service";
import type { SearchResult } from "@/lib/services/search-state-service";
import { useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";

interface SingaporeMapExplorerProps {
  initialRandomCoords: { latitude: number; longitude: number };
  singaporeLocations: GeocodeResult[];
  staticMapUrl: string;
  mapboxPublicToken: string;
}

export function SingaporeMapExplorer({
  initialRandomCoords,
  singaporeLocations,
  staticMapUrl,
  mapboxPublicToken,
}: SingaporeMapExplorerProps) {
  const isMobile = useMobile();
  const [randomCoords, setRandomCoords] = useState(initialRandomCoords);
  const [staticMapUrlState, setStaticMapUrlState] = useState(staticMapUrl);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapLocation, setMapLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(initialRandomCoords);
  const [isUserLocation, setIsUserLocation] = useState(false);

  // Bicycle parking state
  const [bicycleParkingResults, setBicycleParkingResults] = useState<
    BicycleParkingResult[]
  >([]);
  const [isFetchingParking, setIsFetchingParking] = useState(false);
  const [selectedParking, setSelectedParking] =
    useState<BicycleParkingResult | null>(null);

  // Callback to add results to search panel from outside
  const [addSearchResult, setAddSearchResult] = useState<
    ((result: SearchResult) => void) | null
  >(null);

  // Always use satellite-streets as default map style
  const [mapStyle, setMapStyle] = useState(MAPBOX_STYLES.satelliteStreets);

  // Rainfall visualization state
  const [showRainfall, setShowRainfall] = useState(false);
  const [useMockRainfall, setUseMockRainfall] = useState(false);

  // Saved locations for random navigation - using Convex reactive query
  // Returns undefined during SSR or when ConvexProvider is not available
  const convexLocations = useQuery(api.locations.getRandomizableLocations, {});
  const [savedLocations, setSavedLocations] = useState<
    Array<{ latitude: number; longitude: number; title: string }>
  >([]);
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);

  // Reactively update saved locations when Convex data changes
  useEffect(() => {
    if (!convexLocations || convexLocations.length === 0) {
      if (convexLocations !== undefined) {
        logger.warn(
          "No saved locations found with isRandomizable=true. Make sure Convex schema is deployed with 'pnpm run dev:convex'",
        );
      }
      setSavedLocations([]);
      return;
    }

    logger.info(
      `🔄 Convex update: ${convexLocations.length} saved locations for sequential navigation`,
    );

    // Shuffle the locations array
    const shuffled = [...convexLocations].sort(() => Math.random() - 0.5);

    // Log the shuffled order
    logger.info(
      "🔀 Shuffled order:",
      shuffled.map((loc, idx) => `${idx + 1}. ${loc.title}`).join(", "),
    );

    // Map to simple format
    const mappedLocations = shuffled.map((loc) => ({
      latitude: loc.latitude,
      longitude: loc.longitude,
      title: loc.title,
    }));

    setSavedLocations(mappedLocations);
    setCurrentLocationIndex(0); // Reset to start of shuffled list
  }, [convexLocations]); // This will re-run whenever Convex data changes!

  // Fetch bicycle parking for a location
  const fetchBicycleParking = useCallback(async (lat: number, long: number) => {
    setIsFetchingParking(true);
    try {
      const response = await fetch(
        `/api/bicycle-parking?lat=${lat}&long=${long}`,
      );
      if (response.ok) {
        const data = await response.json();
        setBicycleParkingResults(data.results || []);
        logger.info(
          `Found ${data.results?.length || 0} bicycle parking locations`,
        );
      } else {
        logger.error("Failed to fetch bicycle parking", {
          status: response.status,
        });
        setBicycleParkingResults([]);
      }
    } catch (error) {
      logger.error("Error fetching bicycle parking", error);
      setBicycleParkingResults([]);
    } finally {
      setIsFetchingParking(false);
    }
  }, []);

  // Fetch bicycle parking when map location changes
  useEffect(() => {
    if (mapLocation) {
      fetchBicycleParking(mapLocation.latitude, mapLocation.longitude);
    }
  }, [mapLocation, fetchBicycleParking]);

  const handleMapReady = useCallback(
    (map: mapboxgl.Map) => {
      mapInstanceRef.current = map;
      setIsMapReady(true);

      // Fly to initial location with a dramatic zoom-in animation
      logger.debug("Map ready, flying in from zoom 2 to 10");
      map.stop(); // Stop any ongoing animations

      // Wait for next frame to ensure stop() has completed
      requestAnimationFrame(() => {
        map.flyTo({
          center: [initialRandomCoords.longitude, initialRandomCoords.latitude],
          zoom: 10, // Zoom in to show Singapore island
          duration: 2500, // Longer duration for dramatic effect
          essential: true,
          curve: 1.5, // Higher curve for more dramatic arc
          easing: (t) => t * (2 - t),
        });
      });
    },
    [initialRandomCoords],
  );

  // Handle search result selection - flyTo the selected location (moved before handleCoordinatesGenerated)
  const handleSearchResultSelect = useCallback((result: SearchResult) => {
    logger.info("Search result selected", {
      title: result.title,
      location: result.location,
    });

    // Fly to the search result with cinematic animation
    if (mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      const currentCenter = map.getCenter();

      logger.debug("Current map center", {
        lng: currentCenter.lng,
        lat: currentCenter.lat,
      });
      logger.debug("Flying to", {
        longitude: result.location.longitude,
        latitude: result.location.latitude,
      });

      // Function to execute flyTo
      const executeFlyTo = () => {
        map.stop(); // Stop any ongoing animations before starting new one

        // Wait for next frame to ensure stop() has completed
        requestAnimationFrame(() => {
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
          logger.success("flyTo called successfully");

          // Update marker location AFTER flyTo starts (to avoid re-render before animation)
          setMapLocation(result.location);
          setIsUserLocation(false);
        });
      };

      // If map style is still loading, wait for it to finish
      if (!map.isStyleLoaded()) {
        logger.debug("Map style loading, waiting for styledata event");
        map.once("styledata", () => {
          logger.success("Map style loaded, executing flyTo");
          executeFlyTo();
        });
      } else {
        executeFlyTo();
      }
    } else {
      logger.warn("Map instance not ready yet");
    }
  }, []);

  const handleCoordinatesGenerated = useCallback(
    (newCoords: {
      latitude: number;
      longitude: number;
      title?: string;
      description?: string;
    }) => {
      // Update static map URL with new coordinates
      const newStaticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${newCoords.longitude},${newCoords.latitude},12/400x300?access_token=${mapboxPublicToken}`;
      setStaticMapUrlState(newStaticMapUrl);

      // If we have location info, create a SearchResult and add it to search panel
      if (newCoords.title) {
        const searchResult: SearchResult = {
          id: `saved-${Date.now()}`,
          title: newCoords.title,
          description: newCoords.description || "Saved location",
          location: {
            latitude: newCoords.latitude,
            longitude: newCoords.longitude,
          },
          source: "database",
          timestamp: Date.now(),
        };

        // Add to search results first (if callback is available)
        if (addSearchResult) {
          addSearchResult(searchResult);
        }

        // Then fly to location
        handleSearchResultSelect(searchResult);
        return;
      }

      // Fly to new random coordinates with smooth animation (no pitch/bearing)
      if (mapInstanceRef.current) {
        const map = mapInstanceRef.current;

        const executeFlyTo = () => {
          map.stop(); // Stop any ongoing animations before starting new one

          // Wait for next frame to ensure stop() has completed
          requestAnimationFrame(() => {
            map.flyTo({
              center: [newCoords.longitude, newCoords.latitude],
              zoom: 10, // Match final zoom level after initial animation
              duration: 1500,
              essential: true,
              curve: 1.2,
              easing: (t) => t * (2 - t),
            });

            // Update state after flyTo starts
            setRandomCoords(newCoords);
            setMapLocation(newCoords);
            setIsUserLocation(false);
          });
        };

        if (!map.isStyleLoaded()) {
          map.once("styledata", executeFlyTo);
        } else {
          executeFlyTo();
        }
      }
    },
    [mapboxPublicToken, handleSearchResultSelect, addSearchResult],
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
          map.stop(); // Stop any ongoing animations before starting new one

          // Wait for next frame to ensure stop() has completed
          requestAnimationFrame(() => {
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
          });
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

  // Handle bicycle parking selection - flyTo the parking location
  const handleParkingSelect = useCallback((parking: BicycleParkingResult) => {
    logger.info("Bicycle parking selected", {
      description: parking.description,
      location: { latitude: parking.latitude, longitude: parking.longitude },
    });

    setSelectedParking(parking);

    // Fly to the parking location
    if (mapInstanceRef.current) {
      const map = mapInstanceRef.current;

      const executeFlyTo = () => {
        map.stop(); // Stop any ongoing animations before starting new one

        // Wait for next frame to ensure stop() has completed
        requestAnimationFrame(() => {
          map.flyTo({
            center: [parking.longitude, parking.latitude],
            zoom: 18, // Zoom in very close
            duration: 2000,
            essential: true,
            curve: 1.4,
            easing: (t) => t * (2 - t),
          });
        });
      };

      if (!map.isStyleLoaded()) {
        map.once("styledata", executeFlyTo);
      } else {
        executeFlyTo();
      }
    }
  }, []);

  return (
    <div className="font-sans min-h-screen">
      <ErrorToastHandler
        singaporeLocationsCount={singaporeLocations.length}
        staticMapUrl={staticMapUrlState}
      />

      {/* Header with map style selector and navigation controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <HowToButton />
        <MapStyleSelector onStyleChange={handleStyleChange} />
        <RandomCoordinatesButton
          onCoordinatesGenerated={handleCoordinatesGenerated}
          savedLocations={savedLocations}
          currentIndex={currentLocationIndex}
          onIndexChange={setCurrentLocationIndex}
        />
        <LocateMeButton onLocationFound={handleLocationFound} />
        <RainfallToggleButton
          isActive={showRainfall}
          onClick={() => setShowRainfall(!showRainfall)}
        />
        {showRainfall && (
          <RainfallMockToggleButton
            isMockMode={useMockRainfall}
            onClick={() => setUseMockRainfall(!useMockRainfall)}
          />
        )}
        {/* <ThemeToggle /> */}
      </div>

      {/* Search Panel */}
      <SearchPanel
        onResultSelect={handleSearchResultSelect}
        onSearchStateReady={(addResult) => setAddSearchResult(() => addResult)}
      />

      {/* Bicycle Parking Panel - Hide on Mobile */}
      {!isMobile && (
        <BicycleParkingPanel
          parkingResults={bicycleParkingResults}
          isLoading={isFetchingParking}
          onParkingSelect={handleParkingSelect}
          selectedParking={selectedParking}
        />
      )}

      {/* Rainfall Panel - Hide on Mobile, Show when rainfall is active */}
      {!isMobile && showRainfall && (
        <RainfallPanel
          useMockData={useMockRainfall}
          onStationClick={(lat, lng) => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.flyTo({
                center: [lng, lat],
                zoom: 16,
                duration: 1500,
              });
            }
          }}
        />
      )}

      {/* Main Interactive Map */}
      <div className="relative w-full h-screen">
        <MapboxGLMap
          center={[randomCoords.longitude, randomCoords.latitude]}
          zoom={2}
          className="w-full h-full"
          accessToken={mapboxPublicToken}
          onMapReady={handleMapReady}
          style={mapStyle}
        />
        {isMapReady && mapInstanceRef.current && mapLocation && (
          <>
            <MapboxSimpleOverlay
              key={`${mapLocation.latitude}-${mapLocation.longitude}-${isUserLocation}`}
              map={mapInstanceRef.current}
              coordinates={mapLocation}
              isUserLocation={isUserLocation}
            />
            <BicycleParkingOverlay
              map={mapInstanceRef.current}
              parkingLocations={bicycleParkingResults}
              onParkingSelect={handleParkingSelect}
              selectedParking={selectedParking}
            />
            <SavedBicycleParkingOverlay map={mapInstanceRef.current} />
            <SavedLocationsOverlay map={mapInstanceRef.current} />
            {showRainfall && (
              <RainfallHeatMapOverlay
                map={mapInstanceRef.current}
                useMockData={useMockRainfall}
                useInterpolation={false}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
