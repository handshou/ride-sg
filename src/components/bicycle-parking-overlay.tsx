"use client";

import type { BicycleParkingResult } from "@/lib/schema/bicycle-parking.schema";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

interface BicycleParkingOverlayProps {
  map: mapboxgl.Map;
  parkingLocations: BicycleParkingResult[];
  onParkingSelect?: (parking: BicycleParkingResult) => void;
}

/**
 * Bicycle Parking Overlay Component
 *
 * Renders bicycle parking locations as Mapbox GL layers (GeoJSON source + circle layer).
 * This ensures perfect synchronization with map animations (flyTo) as the markers
 * are rendered directly on the map canvas rather than as DOM overlays.
 *
 * Features:
 * - Circle size scales with rack count
 * - Different colors for sheltered (green) vs non-sheltered (light green)
 * - Clickable circles that trigger onParkingSelect callback
 * - Popups on hover showing parking details
 */
export function BicycleParkingOverlay({
  map,
  parkingLocations,
  onParkingSelect,
}: BicycleParkingOverlayProps) {
  // Use ref to always have access to latest parking locations
  const parkingLocationsRef = useRef(parkingLocations);

  // Update ref whenever parkingLocations changes
  useEffect(() => {
    parkingLocationsRef.current = parkingLocations;
  }, [parkingLocations]);

  useEffect(() => {
    const SOURCE_ID = "bicycle-parking";
    const LAYER_ID = "bicycle-parking-circles";

    console.log(
      `[BicycleParkingOverlay] Effect triggered with ${parkingLocations.length} parking locations`,
    );

    // Setup layers initially and whenever style changes
    // Use ref so we always have the latest parking locations
    const setupLayers = () => {
      const currentParkingLocations = parkingLocationsRef.current;
      console.log(
        `[BicycleParkingOverlay] setupLayers called, style loaded: ${map.isStyleLoaded()}, parking locations: ${currentParkingLocations.length}, layer exists: ${!!map.getLayer(LAYER_ID)}`,
      );

      // If style is not loaded yet, poll until it is (with timeout)
      if (!map.isStyleLoaded()) {
        console.log(
          "[BicycleParkingOverlay] Map style not loaded yet, polling until ready...",
        );

        let attempts = 0;
        const maxAttempts = 50; // 50 * 100ms = 5 seconds max

        const pollStyleLoaded = () => {
          attempts++;

          if (map.isStyleLoaded()) {
            console.log(
              `[BicycleParkingOverlay] Style loaded after ${attempts} attempts, retrying setup`,
            );
            setupLayers();
          } else if (attempts < maxAttempts) {
            setTimeout(pollStyleLoaded, 100); // Check every 100ms
          } else {
            console.error(
              "[BicycleParkingOverlay] Timeout waiting for style to load",
            );
          }
        };

        setTimeout(pollStyleLoaded, 100);
        return;
      }

      // If no parking locations, remove any existing layers and return
      if (currentParkingLocations.length === 0) {
        if (map.getLayer(LAYER_ID)) {
          console.log(
            "[BicycleParkingOverlay] No parking locations, removing existing layers",
          );
          map.removeLayer(LAYER_ID);
        }
        if (map.getSource(SOURCE_ID)) {
          map.removeSource(SOURCE_ID);
        }
        return;
      }

      console.log(
        `[BicycleParkingOverlay] Creating/updating markers for ${currentParkingLocations.length} locations`,
      );

      // Create GeoJSON features from parking locations
      const features = currentParkingLocations.map((parking) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [parking.longitude, parking.latitude],
        },
        properties: {
          id: parking.id,
          description: parking.description,
          rackType: parking.rackType,
          rackCount: parking.rackCount,
          hasShelter: parking.hasShelter,
          // Size calculation: small (8), medium (12), large (16)
          size: parking.rackCount <= 10 ? 8 : parking.rackCount <= 30 ? 12 : 16,
          color: parking.hasShelter ? "#10b981" : "#22c55e",
        },
      }));

      const featureCollection = {
        type: "FeatureCollection" as const,
        features,
      };

      // Check if source already exists - if so, just update its data
      const existingSource = map.getSource(SOURCE_ID) as
        | mapboxgl.GeoJSONSource
        | undefined;

      if (existingSource) {
        console.log("[BicycleParkingOverlay] Updating existing source data");
        existingSource.setData(featureCollection);
        return; // Layer already exists with updated data
      }

      // Remove existing layer if it exists without source (cleanup edge case)
      if (map.getLayer(LAYER_ID)) {
        console.log("[BicycleParkingOverlay] Removing orphaned layer");
        map.removeLayer(LAYER_ID);
      }

      // Add source (first time)
      console.log("[BicycleParkingOverlay] Adding new source and layer");
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: featureCollection,
      });

      // Add circle layer
      map.addLayer({
        id: LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": ["get", "size"],
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-opacity": 1,
        },
      });

      console.log(
        `[BicycleParkingOverlay] ✓ Successfully added ${features.length} bicycle parking markers to map`,
      );

      // Create popup for hover
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "bicycle-parking-popup",
      });

      // Mouse enter: show popup
      map.on("mouseenter", LAYER_ID, (e) => {
        map.getCanvas().style.cursor = "pointer";

        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const props = feature.properties;
          if (!props) return;

          const coordinates = (
            feature.geometry as { type: string; coordinates: [number, number] }
          ).coordinates.slice() as [number, number];

          // Ensure popup appears over the correct location
          while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
          }

          const shelterBadge = props.hasShelter
            ? '<span style="background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px;">🏠 Sheltered</span>'
            : '<span style="background: #9ca3af; color: white; padding: 2px 6px; border-radius: 4px;">No shelter</span>';

          popup
            .setLngLat(coordinates)
            .setHTML(
              `
            <div style="padding: 8px; min-width: 200px;">
              <div style="font-weight: 600; margin-bottom: 4px; color: #1f2937;">
                ${props.description}
              </div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
                ${props.rackType}
              </div>
              <div style="font-size: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
                <span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 4px;">
                  🚲 ${props.rackCount} racks
                </span>
                ${shelterBadge}
              </div>
            </div>
          `,
            )
            .addTo(map);
        }
      });

      // Mouse leave: hide popup
      map.on("mouseleave", LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      // Click: trigger onParkingSelect callback
      map.on("click", LAYER_ID, (e) => {
        if (e.features && e.features.length > 0 && onParkingSelect) {
          const feature = e.features[0];
          const props = feature.properties;
          if (!props) return;

          // Find the full parking object from current parkingLocations
          const parking = parkingLocationsRef.current.find(
            (p) => p.id === props.id,
          );
          if (parking) {
            onParkingSelect(parking);
          }
        }
      });
    };

    // Setup layers initially - the polling mechanism will handle timing
    console.log("[BicycleParkingOverlay] Setting up layers initially");
    setupLayers();

    // Cleanup function
    return () => {
      console.log("[BicycleParkingOverlay] Cleaning up layers");

      // Only cleanup if style is loaded, otherwise we'll get errors
      if (map.isStyleLoaded()) {
        if (map.getLayer(LAYER_ID)) {
          map.removeLayer(LAYER_ID);
        }
        if (map.getSource(SOURCE_ID)) {
          map.removeSource(SOURCE_ID);
        }
      }
    };
  }, [map, parkingLocations, onParkingSelect]);

  return null; // This component renders directly to the map
}
