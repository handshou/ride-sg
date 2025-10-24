"use client";

import { useQuery } from "convex/react";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { moderateAndAnalyzeImageAction } from "@/lib/actions/moderate-and-analyze-image-action";
import {
  calculateBearing,
  calculateDistance,
  getDirectionalDescription,
} from "@/lib/utils/direction-utils";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface CapturedImage {
  _id: string;
  imageUrl: string;
  latitude?: number;
  longitude?: number;
  cameraGpsLatitude?: number;
  cameraGpsLongitude?: number;
  deviceHeading?: number;
  analysis?: string;
  analysisStatus: "not_analyzed" | "processing" | "completed" | "failed";
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
  const [analyzingImages, setAnalyzingImages] = useState<Set<string>>(
    new Set(),
  );

  // Get all captured images with analysis
  const capturedImages = useQuery(api.capturedImages.getAllImages);

  // Handler for analyze button
  const handleAnalyzeImage = async (image: CapturedImage) => {
    setAnalyzingImages((prev) => new Set(prev).add(image._id));

    try {
      const result = await moderateAndAnalyzeImageAction(
        image._id,
        image.imageUrl,
        image.cameraGpsLatitude ?? image.latitude,
        image.cameraGpsLongitude ?? image.longitude,
      );

      if (result.deleted) {
        toast.warning("Image was removed due to inappropriate content");
      } else if (result.success) {
        toast.success("Image analyzed successfully!");
      } else {
        toast.error(`Analysis failed: ${result.error}`);
      }
    } catch (error) {
      toast.error(`Analysis error: ${error}`);
    } finally {
      setAnalyzingImages((prev) => {
        const next = new Set(prev);
        next.delete(image._id);
        return next;
      });
    }
  };

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
          <div class="absolute -inset-1 bg-blue-500/20 rounded-full animate-pulse"></div>
          <div class="relative w-8 h-8 bg-white rounded-full shadow-lg border-2 border-blue-500 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
            <svg
              width="18"
              height="18"
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
              ? `<div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>`
              : image.analysisStatus === "processing"
                ? `<div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-yellow-500 rounded-full border-2 border-white animate-pulse"></div>`
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
            width: 32px;
            height: 32px;
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

      // Create popup content with analyze button
      const isAnalyzing = analyzingImages.has(image._id);
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
                : image.analysisStatus === "not_analyzed"
                  ? `
              <button
                id="analyze-btn-${image._id}"
                class="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors ${isAnalyzing ? "opacity-50 cursor-not-allowed" : ""}"
                ${isAnalyzing ? "disabled" : ""}
              >
                ${isAnalyzing ? "Analyzing..." : "🤖 Analyze with AI"}
              </button>
            `
                  : image.analysisStatus === "processing"
                    ? `
              <div class="text-xs text-gray-500 italic flex items-center gap-2">
                <div class="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                Analyzing...
              </div>
            `
                    : image.analysisStatus === "failed"
                      ? `
              <div class="space-y-2">
                <div class="text-xs text-red-600">Analysis failed</div>
                <button
                  id="analyze-btn-${image._id}"
                  class="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  🔄 Retry Analysis
                </button>
              </div>
            `
                      : ""
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

      // Add event listener for analyze button after popup opens
      popup.on("open", () => {
        const analyzeBtn = document.getElementById(
          `analyze-btn-${image._id}`,
        );
        if (analyzeBtn) {
          analyzeBtn.addEventListener("click", () =>
            handleAnalyzeImage(image),
          );
        }
      });

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
