"use client";

import { useMutation, useQuery } from "convex/react";
import { Effect, Layer } from "effect";
import {
  Camera,
  Image as ImageIcon,
  Monitor,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { moderateAndAnalyzeImageAction } from "@/lib/actions/moderate-and-analyze-image-action";
import { ClientLayer } from "@/lib/runtime/client-layer";
import {
  type CameraOrientation,
  CameraServiceTag,
} from "@/lib/services/camera-service";
import {
  DeviceOrientationServiceTag,
  getDeviceOrientationService,
} from "@/lib/services/device-orientation-service";
import { getCurrentPositionEffect } from "@/lib/services/geolocation-service";
import { ImageCaptureServiceTag } from "@/lib/services/image-capture-service";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface CameraCaptureButtonProps {
  currentLocation?: { latitude: number; longitude: number };
}

export function CameraCaptureButton({
  currentLocation,
}: CameraCaptureButtonProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [orientation, setOrientation] = useState<CameraOrientation>("portrait");
  const [showGallery, setShowGallery] = useState(false);
  const [analyzingImages, setAnalyzingImages] = useState<Set<string>>(
    new Set(),
  );
  const videoRef = useRef<HTMLVideoElement>(null);

  // Convex mutations
  const generateUploadUrl = useMutation(api.capturedImages.generateUploadUrl);
  const saveCapturedImage = useMutation(api.capturedImages.saveCapturedImage);
  const deleteCapturedImage = useMutation(
    api.capturedImages.deleteCapturedImage,
  );
  const capturedImages = useQuery(api.capturedImages.getAllImages);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const cameraService = yield* CameraServiceTag;
          return yield* cameraService.startStream({ orientation });
        }).pipe(Effect.provide(ClientLayer)),
      );

      setStream(result);
      if (videoRef.current) {
        videoRef.current.srcObject = result;
      }
      setIsCameraActive(true);
      toast.success("Camera started");
    } catch (error) {
      toast.error(`Failed to start camera: ${error}`);
    }
  }, [orientation]);

  // Stop camera stream
  const stopCamera = useCallback(async () => {
    if (stream) {
      await Effect.runPromise(
        Effect.gen(function* () {
          const cameraService = yield* CameraServiceTag;
          yield* cameraService.stopStream(stream);
        }).pipe(Effect.provide(ClientLayer)),
      );
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setStream(null);
      setIsCameraActive(false);
      toast.success("Camera stopped");
    }
  }, [stream]);

  // Capture image
  const captureImage = useCallback(async () => {
    if (!stream) {
      toast.error("Camera not active");
      return;
    }

    setIsCapturing(true);
    try {
      // Get device GPS location if available
      let cameraGps: { latitude: number; longitude: number } | null = null;
      try {
        cameraGps = await Effect.runPromise(
          getCurrentPositionEffect().pipe(
            Effect.catchAll(() => Effect.succeed(null)),
          ),
        );
      } catch (error) {
        console.warn("Could not get camera GPS location:", error);
      }

      // Get device heading if available
      let deviceHeading: number | null = null;
      try {
        deviceHeading = await Effect.runPromise(
          Effect.gen(function* () {
            const orientationService = yield* DeviceOrientationServiceTag;
            return yield* orientationService.getCurrentHeading;
          }).pipe(
            Effect.provide(
              Layer.succeed(
                DeviceOrientationServiceTag,
                getDeviceOrientationService(),
              ),
            ),
          ),
        );
      } catch (error) {
        console.warn("Could not get device heading:", error);
      }

      // Capture from stream
      const captured = await Effect.runPromise(
        Effect.gen(function* () {
          const imageCaptureService = yield* ImageCaptureServiceTag;
          return yield* imageCaptureService.captureFromStream(stream, 0.9);
        }).pipe(Effect.provide(ClientLayer)),
      );

      // Upload to Convex storage
      const uploadUrl = await generateUploadUrl();
      const blob = captured.blob;

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image");
      }

      const { storageId } = await uploadResponse.json();

      // Save metadata to Convex with both map location and camera GPS
      const imageId = await saveCapturedImage({
        storageId,
        width: captured.width,
        height: captured.height,
        orientation,
        latitude: currentLocation?.latitude, // Map center location
        longitude: currentLocation?.longitude, // Map center location
        cameraGpsLatitude: cameraGps?.latitude, // Device GPS
        cameraGpsLongitude: cameraGps?.longitude, // Device GPS
        deviceHeading: deviceHeading ?? undefined,
        cameraFov: 60, // Default field of view for mobile cameras
        capturedAt: captured.timestamp,
      });

      toast.success(
        "Image captured! Click 'Analyze with AI' to analyze the image.",
      );
    } catch (error) {
      toast.error(`Failed to capture image: ${error}`);
    } finally {
      setIsCapturing(false);
    }
  }, [
    stream,
    orientation,
    currentLocation,
    generateUploadUrl,
    saveCapturedImage,
    capturedImages,
  ]);

  // Toggle orientation
  const toggleOrientation = () => {
    const newOrientation =
      orientation === "portrait" ? "landscape" : "portrait";
    setOrientation(newOrientation);
    if (isCameraActive) {
      // Restart camera with new orientation
      stopCamera().then(() => {
        setTimeout(() => startCamera(), 300);
      });
    }
  };

  // Sync video element with stream
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, [stream]);

  // Delete image handler
  const handleDeleteImage = useCallback(
    async (imageId: string) => {
      if (!confirm("Are you sure you want to delete this image?")) {
        return;
      }

      try {
        await deleteCapturedImage({ id: imageId as Id<"capturedImages"> });
        toast.success("Image deleted successfully");
      } catch (error) {
        toast.error(`Failed to delete image: ${error}`);
      }
    },
    [deleteCapturedImage],
  );

  // Analyze image handler
  const handleAnalyzeImage = useCallback(
    async (
      imageId: string,
      imageUrl: string,
      latitude?: number,
      longitude?: number,
    ) => {
      setAnalyzingImages((prev) => new Set(prev).add(imageId));

      try {
        const result = await moderateAndAnalyzeImageAction(
          imageId,
          imageUrl,
          latitude,
          longitude,
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
          next.delete(imageId);
          return next;
        });
      }
    },
    [],
  );

  return (
    <>
      {/* Camera Toggle Button */}
      <Button
        onClick={() => {
          if (isCameraActive) {
            stopCamera();
          } else {
            startCamera();
          }
        }}
        variant="outline"
        size="icon"
        className="h-10 w-10 bg-white/95 text-gray-900 border-gray-300 hover:bg-gray-100/95 shadow-md dark:bg-gray-900/95 dark:text-white dark:border-gray-700 dark:hover:bg-gray-800/95"
        title={isCameraActive ? "Stop camera" : "Start camera"}
      >
        {isCameraActive ? (
          <X className="h-5 w-5 text-red-500" />
        ) : (
          <Camera className="h-5 w-5" />
        )}
      </Button>

      {/* Gallery Button */}
      <Button
        onClick={() => setShowGallery(!showGallery)}
        variant="outline"
        size="icon"
        className="h-10 w-10 bg-white/95 text-gray-900 border-gray-300 hover:bg-gray-100/95 shadow-md dark:bg-gray-900/95 dark:text-white dark:border-gray-700 dark:hover:bg-gray-800/95"
        title="View gallery"
      >
        <ImageIcon className="h-5 w-5" />
      </Button>

      {/* Camera Preview Modal */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full">
            {/* Controls Bar */}
            <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
              <div className="flex gap-2">
                <Button
                  onClick={toggleOrientation}
                  variant="outline"
                  size="sm"
                  className="bg-white/90 text-gray-900 hover:bg-white"
                  title={`Switch to ${orientation === "portrait" ? "landscape" : "portrait"}`}
                >
                  {orientation === "portrait" ? (
                    <Smartphone className="h-4 w-4 mr-1" />
                  ) : (
                    <Monitor className="h-4 w-4 mr-1" />
                  )}
                  {orientation === "portrait" ? "Portrait" : "Landscape"}
                </Button>
              </div>
              <Button
                onClick={stopCamera}
                variant="outline"
                size="sm"
                className="bg-red-500/90 text-white hover:bg-red-600"
              >
                <X className="h-4 w-4 mr-1" />
                Close
              </Button>
            </div>

            {/* Video Preview */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full ${
                orientation === "portrait" ? "max-h-[70vh]" : "max-h-[60vh]"
              } object-contain rounded-t-lg`}
            />

            {/* Capture Button */}
            <div className="p-4 flex justify-center">
              <Button
                onClick={captureImage}
                disabled={isCapturing}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8"
              >
                {isCapturing ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                ) : (
                  <Camera className="h-5 w-5 mr-2" />
                )}
                {isCapturing ? "Capturing..." : "Capture Photo"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Gallery Header */}
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Captured Images</h2>
              <Button
                onClick={() => setShowGallery(false)}
                variant="outline"
                size="sm"
              >
                <X className="h-4 w-4 mr-1" />
                Close
              </Button>
            </div>

            {/* Gallery Grid */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              {capturedImages && capturedImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {capturedImages.map((image) => (
                    <div
                      key={image._id}
                      className="relative group rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow"
                    >
                      <Image
                        src={image.imageUrl}
                        alt="Captured"
                        width={400}
                        height={300}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between">
                        {/* Delete button at top right */}
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteImage(image._id);
                            }}
                            className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                            title="Delete image"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {/* Image info at bottom */}
                        <div>
                          <p className="text-white text-xs">
                            {new Date(image.capturedAt).toLocaleString()}
                          </p>
                          {image.analysis && (
                            <p className="text-white text-xs mt-1 line-clamp-3">
                              {image.analysis}
                            </p>
                          )}
                          {image.analyzedObjects &&
                            image.analyzedObjects.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {image.analyzedObjects
                                  .slice(0, 3)
                                  .map((obj, idx) => (
                                    <span
                                      key={`${image._id}-obj-${idx}`}
                                      className="inline-block px-1 py-0.5 text-xs bg-blue-500/30 text-blue-200 rounded text-[10px]"
                                      title={obj.description}
                                    >
                                      {obj.name}
                                    </span>
                                  ))}
                                {image.analyzedObjects.length > 3 && (
                                  <span className="text-xs text-gray-400">
                                    +{image.analyzedObjects.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          {image.analysisStatus === "not_analyzed" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAnalyzeImage(
                                  image._id,
                                  image.imageUrl,
                                  image.cameraGpsLatitude ?? image.latitude,
                                  image.cameraGpsLongitude ?? image.longitude,
                                );
                              }}
                              disabled={analyzingImages.has(image._id)}
                              className="mt-2 w-full px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {analyzingImages.has(image._id)
                                ? "Analyzing..."
                                : "🤖 Analyze with AI"}
                            </button>
                          )}
                          {image.analysisStatus === "processing" && (
                            <p className="text-blue-400 text-xs mt-1">
                              Analyzing...
                            </p>
                          )}
                          {image.analysisStatus === "failed" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAnalyzeImage(
                                  image._id,
                                  image.imageUrl,
                                  image.cameraGpsLatitude ?? image.latitude,
                                  image.cameraGpsLongitude ?? image.longitude,
                                );
                              }}
                              disabled={analyzingImages.has(image._id)}
                              className="mt-2 w-full px-2 py-1 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              🔄 Retry Analysis
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No images captured yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
