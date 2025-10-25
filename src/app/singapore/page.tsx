import { ClientOnly } from "@/components/client-only";
import { SingaporeMapExplorer } from "@/components/singapore-map-explorer";
import {
  getMapboxPublicToken,
  getRainfallData,
  getSingaporeCenterCoords,
  getSingaporeLocation,
  getStaticMap,
  runServerEffect,
  runServerEffectAsync,
} from "@/lib/server-runtime";

// Force dynamic rendering to enable Convex real-time subscriptions
export const dynamic = "force-dynamic";

export default async function SingaporePage() {
  // Start at Singapore's center from MapboxService
  const singaporeCenter = runServerEffect(getSingaporeCenterCoords());

  // Get Mapbox location data
  const singaporeLocations = runServerEffect(getSingaporeLocation());
  // Note: currentLocation removed - use "Locate Me" button for actual GPS location
  const staticMapUrl = runServerEffect(
    getStaticMap(singaporeCenter, 10, {
      width: 400,
      height: 300,
    }),
  );

  // Get Mapbox public token for client-side use
  const mapboxPublicToken = runServerEffect(getMapboxPublicToken());

  // Get rainfall data (NEA API → Convex fallback) - async operation
  const rainfallData = await runServerEffectAsync(getRainfallData());

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
        initialRandomCoords={singaporeCenter}
        singaporeLocations={singaporeLocations}
        staticMapUrl={staticMapUrl}
        mapboxPublicToken={mapboxPublicToken}
        initialRainfallData={rainfallData}
      />
    </ClientOnly>
  );
}
