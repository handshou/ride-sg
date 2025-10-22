"use client";

import { logger } from "@/lib/client-logger";
import {
  generateBoundedGrid,
  type Point,
  SINGAPORE_BOUNDARY,
} from "@/lib/utils/idw-interpolation";
import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";

interface RainfallHeatMapOverlayProps {
  map: mapboxgl.Map | null;
  useMockData?: boolean;
  useInterpolation?: boolean; // Enable IDW interpolation
}

/**
 * Rainfall Heat Map Overlay
 *
 * Renders real-time rainfall data as a heat map on the Mapbox map.
 * Uses Convex reactive queries to automatically update when new data arrives.
 *
 * Visualization approach:
 * - Heatmap activates even at trace rainfall (0.1mm+)
 * - Only stations with 0mm (exactly zero) show nothing
 * - Color intensity scales directly with rainfall amount
 *
 * Color gradient by intensity:
 * - Light Blue (0.1-2mm): Trace/very light rain
 * - Green (2-10mm): Light to moderate rain
 * - Yellow (10-15mm): Moderate to heavy rain
 * - Orange/Red (15mm+): Heavy to extreme rain
 * - Nothing (0mm): Clear sky
 */
export function RainfallHeatMapOverlay({
  map,
  useMockData,
  useInterpolation = true, // Default to using interpolation
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

    // Function to add the rainfall layer
    const addRainfallLayer = () => {
      // Wait for map style to be fully loaded
      if (!map.isStyleLoaded()) {
        logger.debug("⏳ Waiting for map style to load...");
        return;
      }

      try {
        // Convert rainfall data to Point format for interpolation
        const stations: Point[] = rainfallData.map((reading) => ({
          latitude: reading.latitude,
          longitude: reading.longitude,
          value: reading.value,
        }));

        // Log station data for debugging with actual raw data
        logger.info(`📍 Raw weather stations from Convex:`);
        rainfallData.slice(0, 3).forEach((reading) => {
          logger.info(
            `  ${reading.stationName}: lat=${reading.latitude}, lon=${reading.longitude}, value=${reading.value}mm`,
          );
        });

        // Generate interpolated grid if interpolation is enabled
        const dataPoints = useInterpolation
          ? generateBoundedGrid(stations, SINGAPORE_BOUNDARY, 40) // 40x40 grid for good coverage
          : stations;

        logger.info(
          `Rendering ${dataPoints.length} points (${useInterpolation ? "interpolated with IDW" : "raw station data"})`,
        );

        // Log first few interpolated points for debugging - check latitude spread
        if (useInterpolation && dataPoints.length > 0) {
          const sorted = [...dataPoints].sort(
            (a, b) => b.latitude - a.latitude,
          );
          logger.debug(`Sample interpolated points (north to south):`);
          logger.debug(
            `  North: (${sorted[0].latitude.toFixed(4)}, ${sorted[0].longitude.toFixed(4)}): ${sorted[0].value.toFixed(1)}mm`,
          );
          logger.debug(
            `  Center: (${sorted[Math.floor(sorted.length / 2)].latitude.toFixed(4)}, ${sorted[Math.floor(sorted.length / 2)].longitude.toFixed(4)}): ${sorted[Math.floor(sorted.length / 2)].value.toFixed(1)}mm`,
          );
          logger.debug(
            `  South: (${sorted[sorted.length - 1].latitude.toFixed(4)}, ${sorted[sorted.length - 1].longitude.toFixed(4)}): ${sorted[sorted.length - 1].value.toFixed(1)}mm`,
          );
        }

        // Convert to GeoJSON (GeoJSON format: [longitude, latitude])
        const geojsonData: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: dataPoints.map((point) => ({
            type: "Feature" as const,
            properties: {
              value: point.value,
            },
            geometry: {
              type: "Point" as const,
              coordinates: [point.longitude, point.latitude], // GeoJSON is [lon, lat]
            },
          })),
        };

        // Log first few GeoJSON features for debugging
        if (geojsonData.features.length > 0) {
          logger.info(`🗺️ GeoJSON coordinates (first 3):`);
          geojsonData.features.slice(0, 3).forEach((feature, i) => {
            if (feature.geometry.type === "Point" && feature.properties) {
              const coords = feature.geometry.coordinates;
              logger.info(
                `  Point ${i + 1}: [${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}] (lon, lat) = ${feature.properties.value.toFixed(1)}mm`,
              );
            }
          });
        }

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

        // Check if layer exists - if not, add it
        const layerExists = map.getLayer(layerId);

        if (!layerExists) {
          logger.info(
            "🎨 Adding rainfall heatmap layer to map (layer missing)",
          );
          map.addLayer({
            id: layerId,
            type: "heatmap",
            source: sourceId,
            paint: {
              // Weight starts at 0.1mm (trace rain) instead of 0mm
              // This ensures even light rain shows visible heatmap intensity
              "heatmap-weight": [
                "interpolate",
                ["exponential", 1.5],
                ["get", "value"],
                0,
                0, // 0mm = no weight (transparent)
                0.1,
                0.15, // 0.1mm = visible weight (trace rain shows up!)
                1,
                0.25, // 1mm = light weight
                5,
                0.4, // 5mm = moderate weight
                10,
                0.6, // 10mm = higher weight
                15,
                0.8, // 15mm = strong weight
                25,
                1, // 25mm+ = maximum weight
              ],
              // Higher intensity for more vibrant colors
              "heatmap-intensity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                0,
                0.9,
                11,
                1.3,
              ],
              // Color ramp that shows even at low density
              // Lower thresholds so trace rain is visible
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0,
                "rgba(0, 0, 255, 0)", // Transparent for no rain (0mm)
                0.02,
                "rgba(135, 206, 250, 0.4)", // Light blue visible at very low density (trace rain)
                0.1,
                "rgba(100, 200, 255, 0.55)", // Light blue - light rain
                0.25,
                "rgba(0, 255, 100, 0.7)", // Green - light-moderate rain
                0.45,
                "rgba(255, 255, 0, 0.8)", // Yellow - moderate rain
                0.6,
                "rgba(255, 200, 0, 0.85)", // Orange-yellow - moderate-heavy
                0.75,
                "rgba(255, 100, 0, 0.9)", // Orange - heavy rain
                0.85,
                "rgba(255, 50, 0, 0.95)", // Red-orange - very heavy
                1,
                "rgba(200, 0, 0, 1)", // Deep red - extreme rain
              ],
              // Large radius for smooth blending
              "heatmap-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                0,
                20,
                8,
                40,
                11,
                70,
                16,
                120,
              ],
              // Higher opacity for better visibility
              "heatmap-opacity": 0.85,
            },
          });
          layerAddedRef.current = true;
          logger.success("✅ Rainfall heat map layer added successfully");
        } else {
          logger.debug(
            `Layer already exists (${layerId}), updating source only`,
          );
        }
      } catch (error) {
        logger.error("Error rendering rainfall heat map:", error);
      }
    };

    // Try to add the rainfall layer immediately
    addRainfallLayer();

    // If style isn't loaded yet, wait for it
    let handleLoad: (() => void) | null = null;
    if (!map.isStyleLoaded()) {
      logger.debug("⏳ Style not loaded, will retry when ready");
      handleLoad = () => {
        logger.info("✅ Style loaded, adding rainfall layer");
        addRainfallLayer();
      };
      map.once("load", handleLoad);
    }

    // Unified cleanup function (always runs)
    return () => {
      // Clean up load event listener if it was registered
      if (handleLoad) {
        map.off("load", handleLoad);
      }

      // Clean up layer and source
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
  }, [map, rainfallData, useInterpolation]);

  // Re-render when map style changes - directly manipulate map, don't trigger state updates
  useEffect(() => {
    if (!map) return;

    let timeoutId: NodeJS.Timeout | null = null;

    const handleStyleLoad = () => {
      logger.info("🗺️ Map style changed, will re-add rainfall layer");
      // Clear any pending timeout
      if (timeoutId) clearTimeout(timeoutId);

      // Wait for style to be fully loaded before re-adding
      // Using 500ms delay for more reliability across different devices/connections
      timeoutId = setTimeout(() => {
        if (!map.isStyleLoaded()) {
          logger.warn("⚠️ Style not fully loaded after 500ms timeout");
          return;
        }

        const sourceId = sourceIdRef.current;
        const layerId = layerIdRef.current;

        try {
          // Re-add source if it's missing (style change removes it)
          if (!map.getSource(sourceId) && rainfallData) {
            logger.debug("Re-adding source after style change");
            const stations: Point[] = rainfallData.map((reading) => ({
              latitude: reading.latitude,
              longitude: reading.longitude,
              value: reading.value,
            }));
            const dataPoints = useInterpolation
              ? generateBoundedGrid(stations, SINGAPORE_BOUNDARY, 40)
              : stations;
            const geojsonData: GeoJSON.FeatureCollection = {
              type: "FeatureCollection",
              features: dataPoints.map((point) => ({
                type: "Feature" as const,
                properties: { value: point.value },
                geometry: {
                  type: "Point" as const,
                  coordinates: [point.longitude, point.latitude],
                },
              })),
            };
            map.addSource(sourceId, {
              type: "geojson",
              data: geojsonData,
            });
          }

          // Re-add layer if it's missing (style change removes it)
          if (!map.getLayer(layerId)) {
            logger.info("🎨 Re-adding rainfall layer after style change");
            map.addLayer({
              id: layerId,
              type: "heatmap",
              source: sourceId,
              paint: {
                "heatmap-weight": [
                  "interpolate",
                  ["exponential", 1.5],
                  ["get", "value"],
                  0,
                  0,
                  0.1,
                  0.15,
                  1,
                  0.25,
                  5,
                  0.4,
                  10,
                  0.6,
                  15,
                  0.8,
                  25,
                  1,
                ],
                "heatmap-intensity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  0,
                  0.9,
                  11,
                  1.3,
                ],
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0,
                  "rgba(0, 0, 255, 0)",
                  0.02,
                  "rgba(135, 206, 250, 0.4)",
                  0.1,
                  "rgba(100, 200, 255, 0.55)",
                  0.25,
                  "rgba(0, 255, 100, 0.7)",
                  0.45,
                  "rgba(255, 255, 0, 0.8)",
                  0.6,
                  "rgba(255, 200, 0, 0.85)",
                  0.75,
                  "rgba(255, 100, 0, 0.9)",
                  0.85,
                  "rgba(255, 50, 0, 0.95)",
                  1,
                  "rgba(200, 0, 0, 1)",
                ],
                "heatmap-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  0,
                  20,
                  8,
                  40,
                  11,
                  70,
                  16,
                  120,
                ],
                "heatmap-opacity": 0.85,
              },
            });
            layerAddedRef.current = true;
            logger.success("✅ Rainfall layer re-added after style change");
          }
        } catch (error) {
          logger.error("Error re-adding rainfall layer:", error);
        }
      }, 500); // Increased from 200ms to 500ms for better reliability
    };

    // Listen to styledata event (fires when style changes)
    map.on("styledata", handleStyleLoad);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      map.off("styledata", handleStyleLoad);
    };
  }, [map, rainfallData, useInterpolation]); // Now depends on data we need

  return null; // This component doesn't render any DOM elements
}
