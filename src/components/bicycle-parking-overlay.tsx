"use client";

import type { BicycleParkingResult } from "@/lib/schema/bicycle-parking.schema";
import { MapReadinessServiceImpl } from "@/lib/services/map-readiness-service";
import { Effect } from "effect";
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
 * Renders bicycle parking locations with intelligent clustering using Mapbox GL layers.
 * Uses three layers: cluster circles, cluster counts, and individual bicycle icons.
 * This ensures perfect synchronization with map animations (flyTo) as the markers
 * are rendered directly on the map canvas rather than as DOM overlays.
 *
 * Features:
 * - 🎯 Smart Clustering: Groups nearby markers when zoomed out (up to zoom 16)
 *   - Green cluster circles with counts (e.g., "15")
 *   - Color-coded by size: light green (< 10), emerald (10-30), dark emerald (30+)
 *   - Click clusters to zoom in and expand
 * - 🚲 Individual Markers (zoom 17+):
 *   - Vibrant bicycle SVG icon with shadow and white background
 *   - 3D-aware: Icons rotate with map bearing and tilt with pitch
 *   - Clickable icons that trigger onParkingSelect callback
 *   - Popups on hover showing parking details
 * - ⚡ Performance: Efficiently handles hundreds of markers
 */
export function BicycleParkingOverlay({
  map,
  parkingLocations,
  onParkingSelect,
}: BicycleParkingOverlayProps) {
  // Use ref to always have access to latest parking locations
  const parkingLocationsRef = useRef(parkingLocations);

  // Map readiness service for proper map state checking
  const mapReadinessService = useRef(new MapReadinessServiceImpl()).current;

  // Update ref whenever parkingLocations changes
  useEffect(() => {
    parkingLocationsRef.current = parkingLocations;
  }, [parkingLocations]);

  useEffect(() => {
    const SOURCE_ID = "bicycle-parking";
    const LAYER_ID = "bicycle-parking-circles";
    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
      console.log(
        `[BicycleParkingOverlay] Effect triggered with ${parkingLocations.length} parking locations`,
      );
    }

    // Setup layers initially and whenever style changes
    // Use ref so we always have the latest parking locations
    const setupLayers = () => {
      const currentParkingLocations = parkingLocationsRef.current;

      if (isDev) {
        console.log(
          `[BicycleParkingOverlay] setupLayers called, style loaded: ${map.isStyleLoaded()}, parking locations: ${currentParkingLocations.length}, layer exists: ${!!map.getLayer(LAYER_ID)}`,
        );
      }

      // Use MapReadinessService to check if map is ready
      Effect.runPromise(mapReadinessService.createReadinessCheck(map))
        .then((isReady) => {
          if (!isReady) {
            if (isDev) {
              console.log(
                "[BicycleParkingOverlay] Map not ready after retries, will try on next update",
              );
            }
            return;
          }

          if (isDev) {
            console.log(
              "[BicycleParkingOverlay] Map is ready, proceeding with setup",
            );
          }
          // Continue with setup after readiness check passes
          proceedWithSetup();
        })
        .catch((error) => {
          console.error(
            "[BicycleParkingOverlay] Map readiness check failed:",
            error,
          );
        });

      return; // Exit early, let the readiness check handle the rest
    };

    function proceedWithSetup() {
      const currentParkingLocations = parkingLocationsRef.current;

      // If no parking locations, remove any existing layers and return
      if (currentParkingLocations.length === 0) {
        if (map.getLayer(LAYER_ID)) {
          if (isDev) {
            console.log(
              "[BicycleParkingOverlay] No parking locations, removing existing layers",
            );
          }
          map.removeLayer(LAYER_ID);
        }
        if (map.getSource(SOURCE_ID)) {
          map.removeSource(SOURCE_ID);
        }
        return;
      }

      if (isDev) {
        console.log(
          `[BicycleParkingOverlay] Creating/updating markers for ${currentParkingLocations.length} locations`,
        );
      }

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
        if (isDev) {
          console.log("[BicycleParkingOverlay] Updating existing source data");
        }
        existingSource.setData(featureCollection);

        // Check if layers still exist (may be removed after style change)
        const layersExist =
          map.getLayer(LAYER_ID) &&
          map.getLayer(`${LAYER_ID}-clusters`) &&
          map.getLayer(`${LAYER_ID}-cluster-count`);

        if (layersExist) {
          if (isDev) {
            console.log("[BicycleParkingOverlay] Layers exist, data updated");
          }
          return; // Layers already exist with updated data
        } else {
          if (isDev) {
            console.log(
              "[BicycleParkingOverlay] Layers missing after style change, re-adding",
            );
          }
          // Fall through to add layers again
        }
      }

      // Remove existing layers if they exist without source (cleanup edge case)
      const layersToRemove = [
        LAYER_ID,
        `${LAYER_ID}-clusters`,
        `${LAYER_ID}-cluster-count`,
      ];
      for (const layerId of layersToRemove) {
        if (map.getLayer(layerId)) {
          if (isDev) {
            console.log(
              `[BicycleParkingOverlay] Removing orphaned layer: ${layerId}`,
            );
          }
          map.removeLayer(layerId);
        }
      }

      // Add source only if it doesn't exist
      if (!existingSource) {
        if (isDev) {
          console.log(
            "[BicycleParkingOverlay] Adding new source with clustering",
          );
        }
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: featureCollection,
          cluster: true, // Enable clustering
          clusterMaxZoom: 16, // Max zoom to cluster points (start showing individual markers at zoom 17+)
          clusterRadius: 50, // Radius in pixels to group points into clusters
        });
      }

      // Load bicycle icon as SVG and add symbol layer
      const bicycleIconId = "bicycle-icon";

      // Check if icon is already loaded
      if (!map.hasImage(bicycleIconId)) {
        if (isDev) {
          console.log("[BicycleParkingOverlay] Loading bicycle icon");
        }

        // Create a vibrant bicycle SVG icon with bright colors and shadow
        const size = 50; // Larger canvas for better quality
        const bicycleSVG = `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000000" flood-opacity="0.5"/>
              </filter>
            </defs>
            <circle cx="12" cy="12" r="11" fill="#ffffff" opacity="0.9"/>
            <path fill="#22c55e" stroke="#047857" stroke-width="1" filter="url(#shadow)" d="M5 20.5A3.5 3.5 0 0 1 1.5 17A3.5 3.5 0 0 1 5 13.5A3.5 3.5 0 0 1 8.5 17A3.5 3.5 0 0 1 5 20.5M5 12A5 5 0 0 0 0 17A5 5 0 0 0 5 22A5 5 0 0 0 10 17A5 5 0 0 0 5 12M14.8 10H19V8.2H15.8L14.8 10M19 20.5A3.5 3.5 0 0 1 15.5 17A3.5 3.5 0 0 1 19 13.5A3.5 3.5 0 0 1 22.5 17A3.5 3.5 0 0 1 19 20.5M19 12A5 5 0 0 0 14 17A5 5 0 0 0 19 22A5 5 0 0 0 24 17A5 5 0 0 0 19 12M13.5 5.5C14.3 5.5 15 6.2 15 7C15 7.8 14.3 8.5 13.5 8.5C12.7 8.5 12 7.8 12 7C12 6.2 12.7 5.5 13.5 5.5M10 6L8.5 10L11.1 11.9L12.1 13.5L14.2 13.2L13.1 11.2L11.5 10.6L12.4 8H15.5L17 11.8L19 12L17.4 6H10Z"/>
          </svg>
        `;

        // Convert SVG to image
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          console.error("[BicycleParkingOverlay] Failed to get canvas context");
          return;
        }

        const img = new Image();
        img.onload = () => {
          try {
            ctx.drawImage(img, 0, 0, size, size);
            const imageData = ctx.getImageData(0, 0, size, size);

            if (!map.hasImage(bicycleIconId)) {
              map.addImage(bicycleIconId, imageData);

              if (isDev) {
                console.log(
                  "[BicycleParkingOverlay] Bicycle icon loaded successfully",
                );
              }
            }

            // Add the cluster layers after image is loaded
            addClusterLayers();
          } catch (error) {
            console.error(
              "[BicycleParkingOverlay] Error loading bicycle icon:",
              error,
            );
          }
        };

        img.onerror = (error) => {
          console.error(
            "[BicycleParkingOverlay] Failed to load bicycle SVG:",
            error,
          );
          // Try to add layers anyway with a fallback approach
          addClusterLayers();
        };

        img.src = `data:image/svg+xml;base64,${btoa(bicycleSVG)}`;
      } else {
        // Image already exists, just add the layers
        addClusterLayers();
      }

      function addClusterLayers() {
        if (isDev) {
          console.log(
            "[BicycleParkingOverlay] Adding clustered bicycle parking layers",
          );
        }

        try {
          // Layer 1: Cluster circles (for grouped markers)
          map.addLayer({
            id: `${LAYER_ID}-clusters`,
            type: "circle",
            source: SOURCE_ID,
            filter: ["has", "point_count"], // Only show clusters
            paint: {
              // Color based on cluster size
              "circle-color": [
                "step",
                ["get", "point_count"],
                "#22c55e", // Green for small clusters (< 10)
                10,
                "#10b981", // Emerald for medium clusters (10-30)
                30,
                "#059669", // Dark emerald for large clusters (30+)
              ],
              // Size based on cluster size
              "circle-radius": [
                "step",
                ["get", "point_count"],
                20, // Small clusters: 20px
                10,
                30, // Medium clusters: 30px
                30,
                40, // Large clusters: 40px
              ],
              "circle-stroke-width": 3,
              "circle-stroke-color": "#ffffff",
              "circle-opacity": 0.9,
            },
          });

          // Layer 2: Cluster count text
          map.addLayer({
            id: `${LAYER_ID}-cluster-count`,
            type: "symbol",
            source: SOURCE_ID,
            filter: ["has", "point_count"],
            layout: {
              "text-field": ["get", "point_count_abbreviated"],
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
              "text-size": 14,
            },
            paint: {
              "text-color": "#ffffff",
            },
          });

          // Layer 3: Individual unclustered bicycle markers
          map.addLayer({
            id: LAYER_ID,
            type: "symbol",
            source: SOURCE_ID,
            filter: ["!", ["has", "point_count"]], // Only show individual markers
            layout: {
              // Use bicycle icon image
              "icon-image": bicycleIconId,
              // Constant size for all zoom levels (small and consistent)
              "icon-size": 0.4, // Small, consistent size
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
              "icon-rotation-alignment": "map",
              "icon-pitch-alignment": "map",
            },
            paint: {
              "icon-opacity": 1,
            },
          });

          if (isDev) {
            console.log(
              `[BicycleParkingOverlay] ✓ Successfully added ${features.length} bicycle parking markers with clustering`,
            );
          }
        } catch (error) {
          console.error(
            "[BicycleParkingOverlay] Error adding cluster layers:",
            error,
          );
          // Log more details about what failed
          if (isDev) {
            console.error(
              "Failed to add cluster layers. Map style loaded:",
              map.isStyleLoaded(),
              "Has bicycle icon:",
              map.hasImage(bicycleIconId),
            );
          }
        }
      }

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
            ? '<span style="background: #059669; color: white; padding: 2px 6px; border-radius: 4px;">🏠 Sheltered</span>'
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

      // Click: trigger onParkingSelect callback for individual markers
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

      // Click on cluster: zoom in
      map.on("click", `${LAYER_ID}-clusters`, (e) => {
        if (e.features && e.features.length > 0) {
          const features = map.queryRenderedFeatures(e.point, {
            layers: [`${LAYER_ID}-clusters`],
          });
          const clusterId = features[0]?.properties?.cluster_id;
          if (clusterId !== undefined) {
            const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
            source.getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err) return;

              const geometry = features[0].geometry;
              if (geometry.type === "Point") {
                map.easeTo({
                  center: geometry.coordinates as [number, number],
                  zoom: zoom ?? map.getZoom() + 2,
                });
              }
            });
          }
        }
      });

      // Hover effects for clusters
      map.on("mouseenter", `${LAYER_ID}-clusters`, () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", `${LAYER_ID}-clusters`, () => {
        map.getCanvas().style.cursor = "";
      });
    }

    // Setup layers initially - the polling mechanism will handle timing
    if (isDev) {
      console.log("[BicycleParkingOverlay] Setting up layers initially");
    }
    setupLayers();

    // Listen for style changes and re-add layers
    const handleStyleData = () => {
      if (isDev) {
        console.log(
          "[BicycleParkingOverlay] Style changed, re-adding bicycle parking layers",
        );
      }
      // Re-add layers after style has fully loaded
      setupLayers();
    };

    map.on("styledata", handleStyleData);

    // Cleanup function
    return () => {
      if (isDev) {
        console.log("[BicycleParkingOverlay] Cleaning up layers");
      }

      // Remove style change listener
      map.off("styledata", handleStyleData);

      // Only cleanup if style is loaded, otherwise we'll get errors
      if (map.isStyleLoaded()) {
        // Remove all three layers
        const layersToCleanup = [
          LAYER_ID,
          `${LAYER_ID}-clusters`,
          `${LAYER_ID}-cluster-count`,
        ];
        for (const layerId of layersToCleanup) {
          if (map.getLayer(layerId)) {
            map.removeLayer(layerId);
          }
        }
        // Remove source
        if (map.getSource(SOURCE_ID)) {
          map.removeSource(SOURCE_ID);
        }
      }
    };
  }, [
    map,
    parkingLocations,
    onParkingSelect,
    mapReadinessService.createReadinessCheck,
  ]);

  return null; // This component renders directly to the map
}
