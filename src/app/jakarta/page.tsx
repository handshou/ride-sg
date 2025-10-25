import { ClientOnly } from "@/components/client-only";
import { JakartaMapExplorer } from "@/components/jakarta-map-explorer";
import {
  getJakartaCenterCoords,
  getMapboxPublicToken,
  getSingaporeLocation,
  getStaticMap,
  runServerEffect,
} from "@/lib/server-runtime";

// Force dynamic rendering to enable Convex real-time subscriptions
export const dynamic = "force-dynamic";

export default async function JakartaPage() {
  // Start at Jakarta's center from MapboxService
  const jakartaCenter = runServerEffect(getJakartaCenterCoords());

  // Get Mapbox location data (reusing Singapore's for now - can be extended)
  const singaporeLocations = runServerEffect(getSingaporeLocation());
  const staticMapUrl = runServerEffect(
    getStaticMap(jakartaCenter, 10, {
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
      <JakartaMapExplorer
        initialRandomCoords={jakartaCenter}
        singaporeLocations={singaporeLocations}
        staticMapUrl={staticMapUrl}
        mapboxPublicToken={mapboxPublicToken}
      />
    </ClientOnly>
  );
}
