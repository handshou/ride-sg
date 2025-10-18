import { ErrorToastHandler } from "@/components/error-toast-handler";
import { MapboxGLMap } from "@/components/mapbox-gl-map";
import {
  getCurrentLocation,
  getRandomSingaporeCoords,
  getSingaporeLocation,
  getStaticMap,
  runServerEffect,
} from "@/lib/server-runtime";
import Image from "next/image";

export default function Home() {
  // Get random coordinates from MapboxService
  const randomCoords = runServerEffect(getRandomSingaporeCoords());

  // Get Mapbox location data
  const singaporeLocations = runServerEffect(getSingaporeLocation());
  const currentLocation = runServerEffect(getCurrentLocation());
  const staticMapUrl = runServerEffect(
    getStaticMap(randomCoords, 12, {
      width: 400,
      height: 300,
    }),
  );

  return (
    <div className="font-sans min-h-screen p-8">
      <ErrorToastHandler
        singaporeLocationsCount={singaporeLocations.length}
        currentLocationCount={currentLocation.length}
        staticMapUrl={staticMapUrl}
      />
      <main className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-4">
            🗺️ Singapore Map Explorer
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 text-center">
            Powered by <strong>Effect-TS</strong> and{" "}
            <strong>Mapbox MCP</strong>
          </p>
        </div>

        {/* Mapbox Integration Section */}
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-purple-800 dark:text-purple-200 mb-4">
            🗺️ Mapbox Integration
          </h2>

          {/* Error State Indicators */}
          {singaporeLocations.length === 0 && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ Singapore locations service unavailable - using fallback data
              </p>
            </div>
          )}

          {currentLocation.length === 0 && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ Current location service unavailable - using fallback data
              </p>
            </div>
          )}

          {staticMapUrl.includes("placeholder") && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">
                🚨 Map service unavailable - showing placeholder image
              </p>
            </div>
          )}

          {/* Singapore Locations */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">
              Singapore Locations:
            </h4>
            <div className="space-y-1">
              {singaporeLocations.map((location) => (
                <div
                  key={`${location.coordinates.latitude}-${location.coordinates.longitude}`}
                  className="text-xs text-purple-600 dark:text-purple-400"
                >
                  <span className="font-medium">{location.address}</span>
                  <br />
                  <span className="text-gray-500">
                    📍 {location.coordinates.latitude.toFixed(6)},{" "}
                    {location.coordinates.longitude.toFixed(6)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Current Location */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">
              Current Location:
            </h4>
            <div className="text-xs text-purple-600 dark:text-purple-400">
              {currentLocation.map((location) => (
                <div
                  key={`current-${location.coordinates.latitude}-${location.coordinates.longitude}`}
                >
                  <span className="font-medium">{location.address}</span>
                  <br />
                  <span className="text-gray-500">
                    📍 {location.coordinates.latitude.toFixed(6)},{" "}
                    {location.coordinates.longitude.toFixed(6)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Mapbox GL Map */}
          <div className="mb-6">
            <h4 className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">
              Interactive Singapore Map:
            </h4>
            <div className="text-xs text-purple-600 dark:text-purple-400 mb-2">
              🎲 Random coordinates: {randomCoords.latitude.toFixed(6)},{" "}
              {randomCoords.longitude.toFixed(6)}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded border p-2">
              <MapboxGLMap
                center={[randomCoords.longitude, randomCoords.latitude]}
                zoom={12}
                className="h-96"
              />
              <div className="text-xs text-gray-500 text-center py-2">
                Interactive map with navigation, geolocation, and fullscreen controls
              </div>
            </div>
          </div>

          {/* Static Map */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">
              Static Map (Fallback):
            </h4>
            <div className="bg-white dark:bg-gray-800 rounded border p-2">
              <Image
                src={staticMapUrl}
                alt="Random Singapore Map"
                width={400}
                height={300}
                className="w-full h-48 object-cover rounded"
              />
              <div className="text-xs text-gray-500 text-center py-2">
                Note: Map may not load without a valid Mapbox token
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Map URL: {staticMapUrl.substring(0, 80)}...
            </p>
          </div>

          <p className="text-sm text-purple-600 dark:text-purple-400 mt-4">
            🚀 <strong>Mapbox MCP</strong> integration working with{" "}
            <strong>Effect-TS</strong>! 🎲 <strong>Random map</strong> on each
            refresh! 🗺️ <strong>Interactive Mapbox GL</strong> with full controls!
          </p>
        </div>
      </main>
    </div>
  );
}
