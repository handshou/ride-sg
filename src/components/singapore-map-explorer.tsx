"use client";

import { ConvexHttpClient } from "convex/browser";
import { Effect } from "effect";
import { useCallback, useEffect, useRef, useState } from "react";
import { BicycleParkingOverlay } from "@/components/bicycle-parking-overlay";
import { BicycleParkingPanel } from "@/components/bicycle-parking-panel";
import { ErrorToastHandler } from "@/components/error-toast-handler";
import { HowToButton } from "@/components/how-to-button";
import { LocateMeButton } from "@/components/locate-me-button";
import { MapStyleSelector } from "@/components/map-style-selector";
import { MapboxGLMap } from "@/components/mapbox-gl-map";
import { MapboxSimpleOverlay } from "@/components/mapbox-simple-overlay";
import { RandomCoordinatesButton } from "@/components/random-coordinates-button";
import { SavedBicycleParkingOverlay } from "@/components/saved-bicycle-parking-overlay";
import { SavedLocationsOverlay } from "@/components/saved-locations-overlay";
import { SearchPanel } from "@/components/search-panel";
import { useMobile } from "@/hooks/use-mobile";
import { logger } from "@/lib/client-logger";
import { MAPBOX_STYLES } from "@/lib/map-styles";
import type { BicycleParkingResult } from "@/lib/schema/bicycle-parking.schema";
import { convexPublicDeploymentConfig } from "@/lib/services/config-service";
import type { GeocodeResult } from "@/lib/services/mapbox-service";
import type { SearchResult } from "@/lib/services/search-state-service";
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

  // Always use satellite-streets as default map style
  const [mapStyle, setMapStyle] = useState(MAPBOX_STYLES.satelliteStreets);

  // Saved locations for random navigation
  const [savedLocations, setSavedLocations] = useState<
    Array<{ latitude: number; longitude: number; title: string }>
  >([]);
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);

  // Fetch saved locations on mount and when they're updated
  useEffect(() => {
    const fetchSavedLocations = async () => {
      try {
        // Use Effect config service to get Convex URL
        const deployment = await Effect.runPromise(
          convexPublicDeploymentConfig,
        );
        if (!deployment) {
          logger.warn("NEXT_PUBLIC_CONVEX_URL not configured");
          return;
        }

        logger.info("Fetching saved randomizable locations from Convex...");
        const client = new ConvexHttpClient(deployment);
        const locations = await client.query(
          api.locations.getRandomizableLocations,
          {},
        );

        logger.info(
          `✅ Loaded ${locations.length} saved locations for sequential navigation`,
        );

        // Shuffle the locations array using Fisher-Yates algorithm
        const shuffled = [...locations].sort(() => Math.random() - 0.5);

        // Log the actual locations for debugging
        if (locations.length > 0) {
          logger.info(
            "🔀 Shuffled order:",
            shuffled.map((loc, idx) => `${idx + 1}. ${loc.title}`).join(", "),
          );
        } else {
          logger.warn(
            "No saved locations found with isRandomizable=true. Make sure Convex schema is deployed with 'pnpm run dev:convex'",
          );
        }

        // Map to simple format and shuffle
        const mappedLocations = shuffled.map((loc) => ({
          latitude: loc.latitude,
          longitude: loc.longitude,
          title: loc.title,
        }));

        setSavedLocations(mappedLocations);
        setCurrentLocationIndex(0); // Reset to start of shuffled list
      } catch (error) {
        logger.error("Failed to fetch saved locations", error);
      }
    };

    fetchSavedLocations();

    // Listen for custom event when a location is saved
    const handleLocationSaved = () => {
      logger.info("Location saved, refetching randomizable locations...");
      setTimeout(() => fetchSavedLocations(), 1000); // Wait 1s for Convex to sync
    };

    window.addEventListener("locationSaved", handleLocationSaved);

    return () => {
      window.removeEventListener("locationSaved", handleLocationSaved);
    };
  }, []);

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

      // Fly to initial location with a gentle animation
      logger.debug("Map ready, flying to initial location");
      map.stop(); // Stop any ongoing animations
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
          map.stop(); // Stop any ongoing animations before starting new one
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
          map.stop(); // Stop any ongoing animations before starting new one
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
        map.flyTo({
          center: [parking.longitude, parking.latitude],
          zoom: 18, // Zoom in very close
          duration: 2000,
          essential: true,
          curve: 1.4,
          easing: (t) => t * (2 - t),
        });
      };

      if (!map.isStyleLoaded()) {
        map.once("styledata", executeFlyTo);
      } else {
        executeFlyTo();
      }
    }
  }, []);

  // Handle search result selection - flyTo the selected location
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
        {/* <ThemeToggle /> */}
      </div>

      {/* Search Panel */}
      <SearchPanel onResultSelect={handleSearchResultSelect} />

      {/* Bicycle Parking Panel - Hide on Mobile */}
      {!isMobile && (
        <BicycleParkingPanel
          parkingResults={bicycleParkingResults}
          isLoading={isFetchingParking}
          onParkingSelect={handleParkingSelect}
          selectedParking={selectedParking}
        />
      )}

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
          </>
        )}
      </div>
    </div>
  );
}
