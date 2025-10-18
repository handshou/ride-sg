"use client";

import { ErrorToastHandler } from "@/components/error-toast-handler";
import { LocateMeButton } from "@/components/locate-me-button";
import { MapboxGLMap } from "@/components/mapbox-gl-map";
import { MapboxSimpleOverlay } from "@/components/mapbox-simple-overlay";
import { RandomCoordinatesButton } from "@/components/random-coordinates-button";
import { ThemeToggle } from "@/components/theme-toggle";
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
import Image from "next/image";
import { useState } from "react";

interface SingaporeMapExplorerProps {
  initialRandomCoords: { latitude: number; longitude: number };
  singaporeLocations: Array<{
    address: string;
    coordinates: { latitude: number; longitude: number };
  }>;
  currentLocation: Array<{
    address: string;
    coordinates: { latitude: number; longitude: number };
  }>;
  staticMapUrl: string;
  mapboxPublicToken: string;
}

export function SingaporeMapExplorer({
  initialRandomCoords,
  singaporeLocations,
  currentLocation,
  staticMapUrl,
  mapboxPublicToken,
}: SingaporeMapExplorerProps) {
  const [randomCoords, setRandomCoords] = useState(initialRandomCoords);
  const [staticMapUrlState, setStaticMapUrlState] = useState(staticMapUrl);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [mapLocation, setMapLocation] = useState<{ latitude: number; longitude: number } | null>(initialRandomCoords);
  const [isUserLocation, setIsUserLocation] = useState(false);

  const handleCoordinatesGenerated = (newCoords: {
    latitude: number;
    longitude: number;
  }) => {
    setRandomCoords(newCoords);
    setMapLocation(newCoords);
    setIsUserLocation(false);
    // Update static map URL with new coordinates
    const newStaticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${newCoords.longitude},${newCoords.latitude},12/400x300?access_token=${mapboxPublicToken}`;
    setStaticMapUrlState(newStaticMapUrl);
    
    // Update map center if map is ready
    if (mapInstance) {
      mapInstance.flyTo({
        center: [newCoords.longitude, newCoords.latitude],
        zoom: 12,
        duration: 1000
      });
    }
  };

  const handleLocationFound = (coords: {
    latitude: number;
    longitude: number;
  }) => {
    setRandomCoords(coords);
    setMapLocation(coords);
    setIsUserLocation(true);
    // Update static map URL with new coordinates
    const newStaticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${coords.longitude},${coords.latitude},12/400x300?access_token=${mapboxPublicToken}`;
    setStaticMapUrlState(newStaticMapUrl);
    
    // Update map center if map is ready
    if (mapInstance) {
      mapInstance.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: 12,
        duration: 1000
      });
    }
  };

  return (
    <div className="font-sans min-h-screen p-8">
      <ErrorToastHandler
        singaporeLocationsCount={singaporeLocations.length}
        currentLocationCount={currentLocation.length}
        staticMapUrl={staticMapUrlState}
      />
      <main className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1"></div>
            <div className="flex-1 text-center">
              <h1 className="text-4xl font-bold mb-2">🚴 Ride-SG</h1>
              <p className="text-lg text-muted-foreground mb-2">
                Singapore Map Explorer
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Powered by <Badge variant="secondary">Effect-TS</Badge> and{" "}
                <Badge variant="secondary">Mapbox MCP</Badge>
              </p>
            </div>
            <div className="flex-1 flex justify-end">
              <ThemeToggle />
            </div>
          </div>
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

            {staticMapUrlState.includes("placeholder") && (
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

            {/* Location Controls */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">🎯 Location Controls</CardTitle>
                <CardDescription>
                  Generate random coordinates or use your current location
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      🎲 Random Coordinates
                    </h4>
                    <RandomCoordinatesButton
                      onCoordinatesGenerated={handleCoordinatesGenerated}
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">📍 My Location</h4>
                    <LocateMeButton onLocationFound={handleLocationFound} />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Current: {randomCoords.latitude.toFixed(6)},{" "}
                  {randomCoords.longitude.toFixed(6)}
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
                        onMapReady={setMapInstance}
                      />
                      {mapInstance && mapLocation && (
                        <MapboxSimpleOverlay
                          map={mapInstance}
                          coordinates={mapLocation}
                          isUserLocation={isUserLocation}
                        />
                      )}
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
                    src={staticMapUrlState}
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
                  Map URL: {staticMapUrlState.substring(0, 80)}...
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
