import { ClientOnly } from "@/components/client-only";
import { SingaporeMapExplorer } from "@/components/singapore-map-explorer";
import {
  getMapboxPublicToken,
  getRandomSingaporeCoords,
  getSingaporeLocation,
  getStaticMap,
  runServerEffect,
} from "@/lib/server-runtime";

// Force dynamic rendering to enable Convex real-time subscriptions
export const dynamic = "force-dynamic";

export default function Home() {
  // Get random coordinates from MapboxService
  const randomCoords = runServerEffect(getRandomSingaporeCoords());

  // Get Mapbox location data
  const singaporeLocations = runServerEffect(getSingaporeLocation());
  // Note: currentLocation removed - use "Locate Me" button for actual GPS location
  const staticMapUrl = runServerEffect(
    getStaticMap(randomCoords, 12, {
      width: 400,
      height: 300,
    }),
  );

  // Get Mapbox public token for client-side use
  const mapboxPublicToken = runServerEffect(getMapboxPublicToken());

  return (
    <ClientOnly
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
          </div>
        </div>
      }
    >
      <SingaporeMapExplorer
        initialRandomCoords={randomCoords}
        singaporeLocations={singaporeLocations}
        staticMapUrl={staticMapUrl}
        mapboxPublicToken={mapboxPublicToken}
      />
    </ClientOnly>
  );
}
