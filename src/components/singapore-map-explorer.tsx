"use client";

import { useQuery } from "convex/react";
import { Effect, Schema } from "effect";
import { useRouter, useSearchParams } from "next/navigation";
import { runClientEffectAsync } from "@/lib/client-runtime";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BicycleParkingOverlay } from "@/components/bicycle-parking-overlay";
import { BicycleParkingPanel } from "@/components/bicycle-parking-panel";
import { Buildings3DToggleButton } from "@/components/buildings-3d-toggle-button";
import { CameraCaptureButton } from "@/components/camera-capture-button";
import { ErrorToastHandler } from "@/components/error-toast-handler";
import { HowToButton } from "@/components/how-to-button";
import { ImageAnalysisOverlay } from "@/components/image-analysis-overlay";
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
import {
  normalizeBicycleParkingAPIResponse,
  PartialBicycleParkingAPIResponseSchema,
} from "@/lib/schema/bicycle-parking-api.schema";
import { CrossBorderNavigationServiceTag } from "@/lib/services/cross-border-navigation-service";
import { mapNavigation } from "@/lib/services/map-navigation-service";
import type { GeocodeResult } from "@/lib/services/mapbox-service";
import type { SearchResult } from "@/lib/services/search-state-service";
import {
  getThemeForMapStyleEffect,
  ThemeSyncServiceLive,
} from "@/lib/services/theme-sync-service";
import { api } from "../../convex/_generated/api";

interface SingaporeMapExplorerProps {
  initialRandomCoords: { latitude: number; longitude: number };
  singaporeLocations: GeocodeResult[];
  staticMapUrl: string;
  mapboxPublicToken: string;
  initialRainfallData: Array<{
    stationId: string;
    stationName: string;
    latitude: number;
    longitude: number;
    value: number;
    timestamp: string;
    fetchedAt: number;
  }>;
}

export function SingaporeMapExplorer({
  initialRandomCoords,
  singaporeLocations,
  staticMapUrl,
  mapboxPublicToken,
  initialRainfallData,
}: SingaporeMapExplorerProps) {
  const isMobile = useMobile();
  const { setTheme } = useTheme();
  const _router = useRouter();
  const searchParams = useSearchParams();

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

  // Use dark theme as default map style
  const [mapStyle, setMapStyle] = useState(MAPBOX_STYLES.dark);

  // Rainfall visualization state - auto-enabled on load
  const [showRainfall, setShowRainfall] = useState(true);
  const [useMockRainfall, setUseMockRainfall] = useState(false);

  // 3D Buildings visualization state
  const [show3DBuildings, setShow3DBuildings] = useState(false);
  const [currentStyleSupports3D, setCurrentStyleSupports3D] = useState(true);

  // Saved locations for random navigation - using Convex reactive query
  // Returns undefined during SSR or when ConvexProvider is not available
  const convexLocations = useQuery(api.locations.getRandomizableLocations, {});
  const [savedLocations, setSavedLocations] = useState<
    Array<{
      latitude: number;
      longitude: number;
      title: string;
      description?: string;
      convexId?: string;
    }>
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

    // Map to simple format, keeping Convex ID and description
    const mappedLocations = shuffled.map((loc) => ({
      latitude: loc.latitude,
      longitude: loc.longitude,
      title: loc.title,
      description: loc.description,
      convexId: loc._id, // Keep the Convex ID for proper delete functionality
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
        const rawData = await response.json();

        // Validate and normalize response with Schema
        try {
          const partialData = Schema.decodeUnknownSync(
            PartialBicycleParkingAPIResponseSchema,
          )(rawData);
          const normalizedData =
            normalizeBicycleParkingAPIResponse(partialData);

          setBicycleParkingResults(normalizedData.results);
          logger.info(
            `Found ${normalizedData.results.length} bicycle parking locations`,
          );
        } catch (schemaError) {
          logger.error("Schema validation failed for bicycle parking", {
            error: schemaError,
          });
          setBicycleParkingResults([]);
        }
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

  // Handle 3D buildings toggle using centralized Map Style Context
  const toggle3DBuildings = useCallback(
    (map: mapboxgl.Map) => {
      // Wait for style to be loaded
      if (!map.isStyleLoaded()) {
        map.once("style.load", () => toggle3DBuildings(map));
        return;
      }

      const layer = map.getLayer("3d-buildings");

      if (show3DBuildings && !layer) {
        // Determine the best layer to insert before for proper ordering
        const beforeLayers = [
          "waterway-label",
          "road-label",
          "place-label",
          "poi-label",
        ];
        let insertedBefore: string | undefined;

        for (const beforeLayer of beforeLayers) {
          if (map.getLayer(beforeLayer)) {
            insertedBefore = beforeLayer;
            break;
          }
        }

        // Add 3D buildings layer
        const layerConfig: mapboxgl.AnyLayer = {
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 15,
          paint: {
            "fill-extrusion-color": "#aaa",
            "fill-extrusion-height": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              0,
              15.05,
              ["get", "height"],
            ],
            "fill-extrusion-base": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              0,
              15.05,
              ["get", "min_height"],
            ],
            "fill-extrusion-opacity": 0.6,
          },
        };

        if (insertedBefore) {
          map.addLayer(layerConfig, insertedBefore);
          logger.info(`3D buildings layer added (before ${insertedBefore})`);
        } else {
          map.addLayer(layerConfig);
          logger.info("3D buildings layer added (top layer)");
        }
      } else if (!show3DBuildings && layer) {
        // Remove 3D buildings layer
        map.removeLayer("3d-buildings");
        logger.info("3D buildings layer removed");
      }
    },
    [show3DBuildings],
  );

  // Handle 3D buildings toggle state changes
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;
    toggle3DBuildings(mapInstanceRef.current);
  }, [isMapReady, toggle3DBuildings]);

  // Listen for style changes and re-add 3D buildings (with style compatibility check)
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;

    const map = mapInstanceRef.current;

    const handle3DBuildingsStyleChange = () => {
      // Get current style and check if it supports 3D buildings
      const currentStyleUrl = map.getStyle()?.sprite;

      // Detect which style is currently active
      let currentStyle = "light";
      if (currentStyleUrl?.includes("satellite-streets")) {
        currentStyle = "satelliteStreets";
      } else if (currentStyleUrl?.includes("satellite")) {
        currentStyle = "satellite"; // Pure satellite (no buildings)
      } else if (currentStyleUrl?.includes("dark")) {
        currentStyle = "dark";
      } else if (currentStyleUrl?.includes("outdoors")) {
        currentStyle = "outdoors";
      }

      // Only pure satellite (v9) doesn't support 3D buildings
      const supports3D = currentStyle !== "satellite";
      setCurrentStyleSupports3D(supports3D);

      if (!supports3D && show3DBuildings) {
        logger.info(
          `3D buildings disabled (${currentStyle} style doesn't support them)`,
        );
        setShow3DBuildings(false);
        return;
      }

      if (show3DBuildings && supports3D) {
        // Delay to ensure style is fully loaded (500ms for reliability across devices)
        setTimeout(() => {
          if (!map.isStyleLoaded()) {
            logger.warn(
              "Style not fully loaded after 500ms, skipping 3D buildings",
            );
            return;
          }
          toggle3DBuildings(map);
        }, 500);
      }
    };

    map.on("styledata", handle3DBuildingsStyleChange);

    return () => {
      map.off("styledata", handle3DBuildingsStyleChange);
    };
  }, [isMapReady, show3DBuildings, toggle3DBuildings]);

  const handleMapReady = useCallback(
    async (map: mapboxgl.Map) => {
      mapInstanceRef.current = map;
      setIsMapReady(true);

      // Sync UI theme with map style on initial load
      try {
        const theme = await Effect.runPromise(
          getThemeForMapStyleEffect("dark").pipe(
            Effect.provide(ThemeSyncServiceLive),
          ),
        );
        setTheme(theme);
        logger.success(`Initial theme synced to ${theme} (map style: dark)`);
      } catch (error) {
        logger.error("Failed to sync initial theme:", error);
      }

      // Mobile-responsive zoom: start more zoomed in on desktop for better detail
      const targetZoom = isMobile ? 9 : 12; // Desktop: 12 (closer), Mobile: 9
      logger.debug(
        `Map ready, flying to zoom ${targetZoom} (${isMobile ? "mobile" : "desktop"})`,
      );
      map.stop(); // Stop any ongoing animations

      // Wait for next frame to ensure stop() has completed
      requestAnimationFrame(() => {
        map.flyTo({
          center: [initialRandomCoords.longitude, initialRandomCoords.latitude],
          zoom: targetZoom, // Mobile: 9, Desktop: 12
          pitch: 60, // Tilt the camera at 60 degrees for 3D view
          bearing: 0, // North-facing orientation
          duration: 2500, // Longer duration for dramatic effect
          essential: true,
          curve: 1.5, // Higher curve for more dramatic arc
          easing: (t) => t * (2 - t),
        });
      });
    },
    [initialRandomCoords, isMobile, setTheme],
  );

  // Handle search result selection - flyTo the selected location (moved before handleCoordinatesGenerated)
  const handleSearchResultSelect = useCallback(
    (result: SearchResult) => {
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

        // Function to execute flyTo using mapNavigation client API
        const executeFlyTo = async () => {
          await mapNavigation.flyToSearchResult(
            map,
            result.location,
            isMobile,
            () => toast.error("Failed to navigate to location"),
          );

          // Update marker location AFTER flyTo completes
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
    },
    [isMobile],
  );

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
          // Use Convex ID if available (from saved locations), otherwise generate temp ID
          // biome-ignore lint/suspicious/noExplicitAny: Optional convexId property from saved locations
          id: (newCoords as any).convexId || `random-${Date.now()}`,
          title: newCoords.title,
          description: newCoords.description || "Random location in Singapore",
          location: {
            latitude: newCoords.latitude,
            longitude: newCoords.longitude,
          },
          // Mark as database if it has a Convex ID, otherwise mapbox
          // biome-ignore lint/suspicious/noExplicitAny: Optional convexId property from saved locations
          source: (newCoords as any).convexId ? "database" : "mapbox",
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

      // Fly to new random coordinates using mapNavigation client API
      if (mapInstanceRef.current) {
        const map = mapInstanceRef.current;

        const executeFlyTo = async () => {
          await mapNavigation.flyToRandomLocation(map, newCoords, isMobile);

          // Update state after flyTo completes
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
    [mapboxPublicToken, handleSearchResultSelect, addSearchResult, isMobile],
  );

  const handleLocationFound = useCallback(
    async (coords: { latitude: number; longitude: number }) => {
      // Update static map URL with new coordinates
      const newStaticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${coords.longitude},${coords.latitude},12/400x300?access_token=${mapboxPublicToken}`;
      setStaticMapUrlState(newStaticMapUrl);

      // Update state immediately for responsive UI
      setRandomCoords(coords);
      setMapLocation(coords);
      setIsUserLocation(true);

      // Use CrossBorderNavigationService to handle detection, flyTo, and routing
      const mapInstance = mapInstanceRef.current;
      if (!mapInstance) {
        logger.error("Map instance not available");
        return;
      }

      try {
        const result = await runClientEffectAsync(
          Effect.gen(function* () {
            const service = yield* CrossBorderNavigationServiceTag;
            return yield* service.handleLocationFound({
              coordinates: coords,
              currentCity: "singapore",
              map: mapInstance,
              mapboxToken: mapboxPublicToken,
              isMobile,
            });
          }),
        );

        logger.success("Cross-border navigation completed", result);
      } catch (error) {
        logger.error("Cross-border navigation failed", error);
        // Still show location even if navigation fails
        toast.error(
          "Location found, but navigation failed. You may need to manually switch cities.",
        );
      }
    },
    [mapboxPublicToken, isMobile],
  );

  // Handle location from URL params (when routed from another city)
  useEffect(() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const shouldLocate = searchParams.get("locate");

    if (lat && lng && shouldLocate === "true" && mapInstanceRef.current) {
      const coords = {
        latitude: Number.parseFloat(lat),
        longitude: Number.parseFloat(lng),
      };

      logger.info("Loading location from URL params", coords);

      // Update static map URL
      const newStaticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${coords.longitude},${coords.latitude},12/400x300?access_token=${mapboxPublicToken}`;
      setStaticMapUrlState(newStaticMapUrl);

      // Fly to location using mapNavigation client API
      const map = mapInstanceRef.current;
      if (map.isStyleLoaded()) {
        (async () => {
          await mapNavigation.flyTo(map, {
            coordinates: coords,
            zoom: isMobile ? 15 : 16,
            duration: 1800,
            curve: 1.3,
            easing: (t) => t * (2 - t),
            isMobile,
          });

          setRandomCoords(coords);
          setMapLocation(coords);
          setIsUserLocation(true);
        })();
      }
    }
  }, [searchParams, mapboxPublicToken, isMobile]);

  // Handle map style changes
  const handleStyleChange = useCallback((newStyle: string) => {
    setMapStyle(newStyle);
    logger.info(`Map style changed to: ${newStyle}`);
  }, []);

  // Handle bicycle parking selection - flyTo the parking location
  const handleParkingSelect = useCallback(
    (parking: BicycleParkingResult) => {
      logger.info("Bicycle parking selected", {
        description: parking.description,
        location: { latitude: parking.latitude, longitude: parking.longitude },
      });

      setSelectedParking(parking);

      // Fly to the parking location using mapNavigation client API
      if (mapInstanceRef.current) {
        const map = mapInstanceRef.current;

        const executeFlyTo = async () => {
          await mapNavigation.flyToParking(
            map,
            { latitude: parking.latitude, longitude: parking.longitude },
            isMobile,
            () => toast.error("Failed to navigate to parking location"),
          );
        };

        if (!map.isStyleLoaded()) {
          map.once("styledata", executeFlyTo);
        } else {
          executeFlyTo();
        }
      }
    },
    [isMobile],
  );

  return (
    <div className="font-sans min-h-screen">
      <ErrorToastHandler
        singaporeLocationsCount={singaporeLocations.length}
        staticMapUrl={staticMapUrlState}
      />

      {/* Header with map style selector and navigation controls */}
      <div
        className={`absolute top-4 left-4 z-10 flex gap-2 ${
          isMobile ? "right-4 flex-wrap max-w-full" : ""
        }`}
      >
        <HowToButton />
        <MapStyleSelector onStyleChange={handleStyleChange} />
        <Buildings3DToggleButton
          isActive={show3DBuildings}
          disabled={!currentStyleSupports3D}
          onClick={() => setShow3DBuildings(!show3DBuildings)}
        />
        <RandomCoordinatesButton
          onCoordinatesGenerated={handleCoordinatesGenerated}
          savedLocations={savedLocations}
          currentIndex={currentLocationIndex}
          onIndexChange={setCurrentLocationIndex}
        />
        <LocateMeButton onLocationFound={handleLocationFound} />
        <CameraCaptureButton currentLocation={mapLocation || undefined} />
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
        onGetMapCenter={() => {
          if (mapInstanceRef.current) {
            const center = mapInstanceRef.current.getCenter();
            return { lat: center.lat, lng: center.lng };
          }
          return undefined;
        }}
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
          initialRainfallData={initialRainfallData}
          useMockData={useMockRainfall}
          onStationClick={(lat, lng) => {
            if (mapInstanceRef.current) {
              const map = mapInstanceRef.current;
              mapNavigation.flyTo(map, {
                coordinates: { latitude: lat, longitude: lng },
                zoom: isMobile ? 15 : 16,
                duration: 1500,
                isMobile,
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
            <ImageAnalysisOverlay
              map={mapInstanceRef.current}
              currentLocation={mapLocation}
            />
            {showRainfall && (
              <RainfallHeatMapOverlay
                map={mapInstanceRef.current}
                initialRainfallData={initialRainfallData}
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
