"use client";

import mapboxgl from "mapbox-gl";
import { useEffect } from "react";
import type { BicycleParkingResult } from "@/lib/schema/bicycle-parking.schema";

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
  useEffect(() => {
    const SOURCE_ID = "bicycle-parking";
    const LAYER_ID = "bicycle-parking-circles";

    // Wait for map to be loaded
    if (!map.isStyleLoaded()) {
      const handler = () => {
        setupLayers();
      };
      map.once("styledata", handler);
      return () => {
        map.off("styledata", handler);
      };
    }

    setupLayers();

    function setupLayers() {
      // Remove existing layers and source if they exist
      if (map.getLayer(LAYER_ID)) {
        map.removeLayer(LAYER_ID);
      }
      if (map.getSource(SOURCE_ID)) {
        map.removeSource(SOURCE_ID);
      }

      // Create GeoJSON features from parking locations
      const features = parkingLocations.map((parking) => ({
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

      // Add source
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features,
        },
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

          // Find the full parking object from parkingLocations
          const parking = parkingLocations.find((p) => p.id === props.id);
          if (parking) {
            onParkingSelect(parking);
          }
        }
      });
    }

    // Cleanup function - removing the layer automatically removes all event listeners
    return () => {
      if (map.getLayer(LAYER_ID)) {
        map.removeLayer(LAYER_ID);
      }
      if (map.getSource(SOURCE_ID)) {
        map.removeSource(SOURCE_ID);
      }
    };
  }, [map, parkingLocations, onParkingSelect]);

  return null; // This component renders directly to the map
}
