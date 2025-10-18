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

export function getMapStyleForStyle(style: MapStyle): string {
  return MAPBOX_STYLES[style];
}
