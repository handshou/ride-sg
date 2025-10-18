import Image from "next/image";
import { ErrorToastHandler } from "@/components/error-toast-handler";
import { MapboxGLMap } from "@/components/mapbox-gl-map";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="font-sans min-h-screen p-8">
      <ErrorToastHandler
        singaporeLocationsCount={singaporeLocations.length}
        currentLocationCount={currentLocation.length}
        staticMapUrl={staticMapUrl}
      />
      <main className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4">🗺️ Singapore Map Explorer</h1>
          <p className="text-lg text-muted-foreground mb-4">
            Powered by <Badge variant="secondary">Effect-TS</Badge> and{" "}
            <Badge variant="secondary">Mapbox MCP</Badge>
          </p>
        </div>

        {/* Mapbox Integration Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🗺️ Mapbox Integration
            </CardTitle>
            <CardDescription>
              Interactive and static maps powered by Mapbox and Effect-TS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Error State Indicators */}
            {singaporeLocations.length === 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  ⚠️ Singapore locations service unavailable - using fallback
                  data
                </AlertDescription>
              </Alert>
            )}

            {currentLocation.length === 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  ⚠️ Current location service unavailable - using fallback data
                </AlertDescription>
              </Alert>
            )}

            {staticMapUrl.includes("placeholder") && (
              <Alert variant="destructive">
                <AlertDescription>
                  🚨 Map service unavailable - showing placeholder image
                </AlertDescription>
              </Alert>
            )}

            {/* Singapore Locations */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Singapore Locations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {singaporeLocations.map((location) => (
                    <div
                      key={`${location.coordinates.latitude}-${location.coordinates.longitude}`}
                      className="text-sm"
                    >
                      <div className="font-medium">{location.address}</div>
                      <div className="text-muted-foreground text-xs">
                        📍 {location.coordinates.latitude.toFixed(6)},{" "}
                        {location.coordinates.longitude.toFixed(6)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Current Location */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Current Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {currentLocation.map((location) => (
                    <div
                      key={`current-${location.coordinates.latitude}-${location.coordinates.longitude}`}
                      className="text-sm"
                    >
                      <div className="font-medium">{location.address}</div>
                      <div className="text-muted-foreground text-xs">
                        📍 {location.coordinates.latitude.toFixed(6)},{" "}
                        {location.coordinates.longitude.toFixed(6)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Interactive Mapbox GL Map */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  Interactive Singapore Map
                </CardTitle>
                <CardDescription>
                  🎲 Random coordinates: {randomCoords.latitude.toFixed(6)},{" "}
                  {randomCoords.longitude.toFixed(6)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <MapboxGLMap
                    center={[randomCoords.longitude, randomCoords.latitude]}
                    zoom={12}
                    className="h-96"
                    accessToken={mapboxPublicToken}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Interactive map with navigation, geolocation, and fullscreen
                  controls
                </p>
              </CardContent>
            </Card>

            {/* Static Map */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Static Map (Fallback)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Image
                    src={staticMapUrl}
                    alt="Random Singapore Map"
                    width={400}
                    height={300}
                    className="w-full h-48 object-cover"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Note: Map may not load without a valid Mapbox token
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Map URL: {staticMapUrl.substring(0, 80)}...
                </p>
              </CardContent>
            </Card>

            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm">
                🚀 Mapbox MCP
              </Button>
              <Button variant="outline" size="sm">
                ⚡ Effect-TS
              </Button>
              <Button variant="outline" size="sm">
                🎲 Random Map
              </Button>
              <Button variant="outline" size="sm">
                🗺️ Interactive GL
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
