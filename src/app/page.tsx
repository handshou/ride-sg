import { SingaporeMapExplorer } from "@/components/singapore-map-explorer";
import {
  getCurrentLocation,
  getMapboxPublicToken,
  getRandomSingaporeCoords,
  getSingaporeLocation,
  getStaticMap,
  runServerEffect,
} from "@/lib/server-runtime";

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

  // Get Mapbox public token for client-side use
  const mapboxPublicToken = runServerEffect(getMapboxPublicToken());

  return (
    <SingaporeMapExplorer
      initialRandomCoords={randomCoords}
      singaporeLocations={singaporeLocations}
      currentLocation={currentLocation}
      staticMapUrl={staticMapUrl}
      mapboxPublicToken={mapboxPublicToken}
    />
  );
}
