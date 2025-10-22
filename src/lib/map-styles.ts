export type MapStyle =
  | "light"
  | "dark"
  | "satellite"
  | "satelliteStreets"
  | "outdoors";

export const MAPBOX_STYLES: Record<MapStyle, string> = {
  light: "mapbox://styles/mapbox/streets-v12",
  dark: "mapbox://styles/mapbox/dark-v11",
  satellite: "mapbox://styles/mapbox/satellite-v9",
  satelliteStreets: "mapbox://styles/mapbox/satellite-streets-v12",
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
};

/**
 * Map styles that support 3D buildings
 *
 * Only vector-based styles with the 'composite' source support 3D building extrusions.
 * Pure raster styles (satellite-v9) don't have building data.
 */
export const STYLES_WITH_3D_BUILDINGS: Set<MapStyle> = new Set([
  "light",
  "dark",
  "outdoors",
  "satelliteStreets", // ✅ Hybrid style with vector buildings over satellite imagery
  // satellite-v9: ❌ Pure raster only, no vector building data
]);

/**
 * Check if a map style supports 3D building rendering
 */
export function styleSupports3DBuildings(style: MapStyle): boolean {
  return STYLES_WITH_3D_BUILDINGS.has(style);
}

/**
 * Get the MapStyle from a Mapbox style URL
 */
export function getStyleFromUrl(styleUrl: string): MapStyle | null {
  for (const [key, value] of Object.entries(MAPBOX_STYLES)) {
    if (value === styleUrl) {
      return key as MapStyle;
    }
  }
  return null;
}

export function getMapStyleForStyle(style: MapStyle): string {
  return MAPBOX_STYLES[style];
}
