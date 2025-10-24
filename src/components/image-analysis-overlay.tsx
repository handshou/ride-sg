"use client";

import { useQuery } from "convex/react";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";
import {
  calculateBearing,
  calculateDistance,
  getDirectionalDescription,
} from "@/lib/utils/direction-utils";
import { api } from "../../convex/_generated/api";

interface CapturedImage {
  _id: string;
  imageUrl: string;
  latitude?: number;
  longitude?: number;
  deviceHeading?: number;
  analysis?: string;
  analysisStatus: "pending" | "processing" | "completed" | "failed";
  analyzedObjects?: Array<{
    name: string;
    confidence?: number;
    bearing?: number;
    distance?: number;
    description?: string;
  }>;
  capturedAt: number;
}

interface ImageAnalysisOverlayProps {
  map: mapboxgl.Map;
  currentLocation?: { latitude: number; longitude: number };
  onImageSelect?: (image: CapturedImage) => void;
}

export function ImageAnalysisOverlay({
  map,
  currentLocation,
  onImageSelect,
}: ImageAnalysisOverlayProps) {
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupsRef = useRef<mapboxgl.Popup[]>([]);

  // Get all captured images with analysis
  const capturedImages = useQuery(api.capturedImages.getAllImages);

  useEffect(() => {
    if (!map || !capturedImages) return;

    // Clean up existing markers
    markersRef.current.forEach((marker) => {
      marker.remove();
    });
    markersRef.current = [];
    popupsRef.current.forEach((popup) => {
      popup.remove();
    });
    popupsRef.current = [];

    // Filter images with location data
    const imagesWithLocation = capturedImages.filter(
      (img) => img.latitude != null && img.longitude != null,
    );

    imagesWithLocation.forEach((image) => {
      // Create custom marker element with directional arrow
      const el = document.createElement("div");
      el.className = "image-marker";

      // Calculate bearing from current location to image location if available
      let bearing = 0;
      let distance = 0;
      let directionText = "";

      if (currentLocation && image.latitude && image.longitude) {
        bearing = calculateBearing(currentLocation, {
          latitude: image.latitude,
          longitude: image.longitude,
        });
        distance = calculateDistance(currentLocation, {
          latitude: image.latitude,
          longitude: image.longitude,
        });
        directionText = getDirectionalDescription(bearing, distance);
      }

      // Create arrow SVG with rotation based on device heading
      const rotation = image.deviceHeading ? image.deviceHeading : bearing;

      el.innerHTML = `
        <div class="relative">
          <div class="absolute -inset-2 bg-blue-500/20 rounded-full animate-pulse"></div>
          <div class="relative w-12 h-12 bg-white rounded-full shadow-lg border-2 border-blue-500 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              style="transform: rotate(${rotation}deg);"
              class="text-blue-600"
            >
              <path
                d="M12 2L19 21L12 17L5 21L12 2Z"
                fill="currentColor"
                stroke="currentColor"
                stroke-width="2"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          ${
            image.analysisStatus === "completed"
              ? `<div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>`
              : image.analysisStatus === "processing"
                ? `<div class="absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white animate-pulse"></div>`
                : ""
          }
        </div>
      `;

      // Add styles if not already added
      if (!document.getElementById("image-marker-styles")) {
        const style = document.createElement("style");
        style.id = "image-marker-styles";
        style.textContent = `
          .image-marker {
            width: 48px;
            height: 48px;
          }
          .mapboxgl-popup-content {
            padding: 0 !important;
            border-radius: 12px;
            overflow: hidden;
            max-width: 300px;
          }
          .popup-image {
            width: 100%;
            height: 150px;
            object-fit: cover;
          }
          .popup-content {
            padding: 12px;
          }
        `;
        document.head.appendChild(style);
      }

      // Create popup content
      const popupContent = `
        <div class="popup-container">
          <img src="${image.imageUrl}" alt="Captured image" class="popup-image" />
          <div class="popup-content">
            ${
              currentLocation
                ? `
              <div class="text-sm font-medium text-gray-700 mb-2">
                ${directionText}
              </div>
            `
                : ""
            }
            ${
              image.analysis
                ? `
              <div class="text-xs text-gray-600 line-clamp-3">
                ${image.analysis}
              </div>
            `
                : `
              <div class="text-xs text-gray-500 italic">
                ${image.analysisStatus === "processing" ? "Analyzing..." : "Analysis pending"}
              </div>
            `
            }
            ${
              image.analyzedObjects && image.analyzedObjects.length > 0
                ? `
              <div class="mt-2 pt-2 border-t border-gray-200">
                <div class="text-xs font-medium text-gray-700 mb-1">Detected:</div>
                <div class="flex flex-wrap gap-1">
                  ${image.analyzedObjects
                    .slice(0, 3)
                    .map(
                      (obj) => `
                    <span class="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                      ${obj.name}
                    </span>
                  `,
                    )
                    .join("")}
                </div>
              </div>
            `
                : ""
            }
            <div class="mt-2 text-xs text-gray-400">
              ${new Date(image.capturedAt).toLocaleString()}
            </div>
          </div>
        </div>
      `;

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: "300px",
      }).setHTML(popupContent);

      // Create marker
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([image.longitude ?? 0, image.latitude ?? 0])
        .setPopup(popup)
        .addTo(map);

      // Add click handler
      el.addEventListener("click", () => {
        if (onImageSelect) {
          onImageSelect(image);
        }
        // Fly to image location
        if (image.longitude && image.latitude) {
          map.flyTo({
            center: [image.longitude, image.latitude],
            zoom: 17,
            duration: 1500,
          });
        }
      });

      markersRef.current.push(marker);
      popupsRef.current.push(popup);
    });

    // Cleanup function
    return () => {
      markersRef.current.forEach((marker) => {
        marker.remove();
      });
      markersRef.current = [];
      popupsRef.current.forEach((popup) => {
        popup.remove();
      });
      popupsRef.current = [];
    };
  }, [map, capturedImages, currentLocation, onImageSelect]);

  return null;
}
