"use client";

import { logger } from "@/lib/client-logger";
import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";

interface RainfallHeatMapOverlayProps {
  map: mapboxgl.Map | null;
  useMockData?: boolean;
}

/**
 * Rainfall Heat Map Overlay
 *
 * Renders real-time rainfall data as a heat map on the Mapbox map.
 * Uses Convex reactive queries to automatically update when new data arrives.
 *
 * Color gradient:
 * - Blue (0mm): No rain
 * - Green (5mm): Light rain
 * - Yellow (10mm): Moderate rain
 * - Red (20mm+): Heavy rain
 */
export function RainfallHeatMapOverlay({
  map,
  useMockData,
}: RainfallHeatMapOverlayProps) {
  const rainfallData = useQuery(api.rainfall.getLatestRainfall, {
    useMockData: useMockData || false,
  });
  const layerAddedRef = useRef(false);
  const sourceIdRef = useRef("rainfall-data");
  const layerIdRef = useRef("rainfall-heat");

  useEffect(() => {
    if (!map || !rainfallData) return;

    const sourceId = sourceIdRef.current;
    const layerId = layerIdRef.current;

    try {
      // Convert rainfall data to GeoJSON
      const geojsonData: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: rainfallData.map((reading) => ({
          type: "Feature" as const,
          properties: {
            value: reading.value,
            stationId: reading.stationId,
            stationName: reading.stationName,
            timestamp: reading.timestamp,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [reading.longitude, reading.latitude],
          },
        })),
      };

      logger.info(`Rendering ${rainfallData.length} rainfall readings`);

      // Check if source exists, add or update
      const source = map.getSource(sourceId);
      if (source) {
        // Update existing source
        (source as mapboxgl.GeoJSONSource).setData(geojsonData);
      } else {
        // Add new source
        map.addSource(sourceId, {
          type: "geojson",
          data: geojsonData,
        });
      }

      // Add layer if not already added
      if (!layerAddedRef.current && !map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: "heatmap",
          source: sourceId,
          paint: {
            // Increase the heatmap weight based on rainfall value
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["get", "value"],
              0,
              0,
              20,
              1,
            ],
            // Increase the heatmap intensity based on zoom level
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              1,
              12,
              3,
            ],
            // Color ramp for heatmap
            // Blue (0mm) → Green (5mm) → Yellow (10mm) → Red (20mm+)
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(33, 102, 172, 0)",
              0.2,
              "rgb(103, 169, 207)",
              0.4,
              "rgb(209, 229, 240)",
              0.6,
              "rgb(253, 219, 199)",
              0.8,
              "rgb(239, 138, 98)",
              1,
              "rgb(178, 24, 43)",
            ],
            // Adjust the heatmap radius by zoom level
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              10,
              12,
              30,
            ],
            // Transition from heatmap to circle layer by zoom level
            "heatmap-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              7,
              1,
              12,
              0.8,
            ],
          },
        });
        layerAddedRef.current = true;
        logger.success("Rainfall heat map layer added");
      }
    } catch (error) {
      logger.error("Error rendering rainfall heat map:", error);
    }

    // Cleanup function
    return () => {
      if (map && layerAddedRef.current) {
        try {
          const layer = map.getLayer(layerIdRef.current);
          if (layer) {
            map.removeLayer(layerIdRef.current);
            layerAddedRef.current = false;
          }
          const source = map.getSource(sourceIdRef.current);
          if (source) {
            map.removeSource(sourceIdRef.current);
          }
        } catch (error) {
          logger.warn("Error cleaning up rainfall layer:", error);
        }
      }
    };
  }, [map, rainfallData]);

  return null; // This component doesn't render any DOM elements
}
