/**
 * IDW (Inverse Distance Weighting) Interpolation Utilities
 *
 * Provides spatial interpolation for rainfall data to create smooth,
 * continuous heat maps from discrete weather station readings.
 */

export interface Point {
  latitude: number;
  longitude: number;
  value: number;
}

export interface InterpolatedPoint {
  latitude: number;
  longitude: number;
  value: number;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Interpolate value at a point using IDW algorithm
 *
 * @param targetLat - Latitude of point to interpolate
 * @param targetLon - Longitude of point to interpolate
 * @param stations - Array of weather stations with known values
 * @param power - Power parameter (default 2). Higher = more emphasis on nearby points
 * @returns Interpolated rainfall value
 */
export function idwInterpolate(
  targetLat: number,
  targetLon: number,
  stations: Point[],
  power = 3, // Increased from 2 to 3 for more localized effect
): number {
  if (stations.length === 0) return 0;

  // Check if target point is exactly at a station
  const exactMatch = stations.find(
    (s) =>
      Math.abs(s.latitude - targetLat) < 0.001 &&
      Math.abs(s.longitude - targetLon) < 0.001,
  );
  if (exactMatch) return exactMatch.value;

  // Calculate weights based on inverse distance
  let weightedSum = 0;
  let weightSum = 0;

  for (const station of stations) {
    const distance = haversineDistance(
      targetLat,
      targetLon,
      station.latitude,
      station.longitude,
    );

    // Avoid division by zero (should be caught by exactMatch above)
    if (distance < 0.01) return station.value;

    // IDW formula: weight = 1 / distance^power
    // Higher power = more localized influence
    const weight = 1 / distance ** power;
    weightedSum += weight * station.value;
    weightSum += weight;
  }

  return weightedSum / weightSum;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 *
 * @param point - [longitude, latitude]
 * @param polygon - Array of [longitude, latitude] coordinates forming polygon
 * @returns true if point is inside polygon
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][],
): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Check if a point is well inside the polygon (with buffer distance)
 * This prevents heatmap blur from extending beyond boundaries
 *
 * @param point - [longitude, latitude]
 * @param polygon - Array of [longitude, latitude] coordinates
 * @param bufferKm - Buffer distance in kilometers (default 1km for reasonable coverage)
 * @returns true if point is inside and away from edges
 */
function isPointWellInside(
  point: [number, number],
  polygon: [number, number][],
  bufferKm = 1.0,
): boolean {
  // First check if point is inside at all
  if (!isPointInPolygon(point, polygon)) return false;

  // Check distance to all polygon edges
  // Approximate: 1 degree lat/lon ≈ 111 km at Singapore's latitude
  const bufferDegrees = bufferKm / 111;

  const [x, y] = point;

  // Check if point is too close to any edge
  for (let i = 0; i < polygon.length - 1; i++) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[i + 1];

    // Calculate perpendicular distance from point to line segment
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) continue;

    const t = Math.max(
      0,
      Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared),
    );
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    const distance = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);

    // If too close to edge, reject point
    if (distance < bufferDegrees) return false;
  }

  return true;
}

/**
 * Generate interpolated grid bounded by Singapore's coastline
 *
 * @param stations - Weather station readings
 * @param boundary - Singapore boundary polygon coordinates
 * @param gridResolution - Number of grid points per axis (default 50)
 * @returns Array of interpolated points within Singapore boundaries (with buffer)
 */
export function generateBoundedGrid(
  stations: Point[],
  boundary: [number, number][],
  gridResolution = 50,
): InterpolatedPoint[] {
  if (stations.length === 0 || boundary.length === 0) return [];

  // Get bounding box of Singapore
  const lats = boundary.map((p) => p[1]);
  const lons = boundary.map((p) => p[0]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const latStep = (maxLat - minLat) / gridResolution;
  const lonStep = (maxLon - minLon) / gridResolution;

  const interpolatedPoints: InterpolatedPoint[] = [];

  // Generate grid and interpolate only points well inside Singapore
  // Using buffer to prevent heatmap blur from extending into sea/Malaysia
  for (let i = 0; i <= gridResolution; i++) {
    for (let j = 0; j <= gridResolution; j++) {
      const lat = minLat + i * latStep;
      const lon = minLon + j * lonStep;

      // Check if point is well inside Singapore boundary (with 1km buffer)
      if (isPointWellInside([lon, lat], boundary, 1.0)) {
        const value = idwInterpolate(lat, lon, stations);
        interpolatedPoints.push({ latitude: lat, longitude: lon, value });
      }
    }
  }

  return interpolatedPoints;
}

/**
 * Singapore boundary coordinates (approximate outline)
 * These are the main boundary points for Singapore island
 */
export const SINGAPORE_BOUNDARY: [number, number][] = [
  [103.6094, 1.1587], // Southwest point
  [103.6195, 1.2344],
  [103.6419, 1.2722],
  [103.672, 1.3089],
  [103.6894, 1.3156],
  [103.7167, 1.3367],
  [103.7456, 1.3544],
  [103.7719, 1.3678],
  [103.7958, 1.3789],
  [103.8183, 1.3933],
  [103.8414, 1.4089],
  [103.8631, 1.4256],
  [103.8842, 1.4411],
  [103.9056, 1.4511],
  [103.9306, 1.4544],
  [103.9561, 1.45],
  [103.9778, 1.4411],
  [103.9944, 1.4278],
  [104.0056, 1.4089],
  [104.0111, 1.3878],
  [104.0106, 1.3656],
  [104.0056, 1.3444],
  [103.9972, 1.3244],
  [103.9861, 1.3056],
  [103.9722, 1.2889],
  [103.9556, 1.2744],
  [103.9361, 1.2622],
  [103.9139, 1.2533],
  [103.8889, 1.2478],
  [103.8611, 1.2456],
  [103.8322, 1.2467],
  [103.8028, 1.2511],
  [103.7744, 1.2578],
  [103.7478, 1.2656],
  [103.7233, 1.2733],
  [103.7011, 1.28],
  [103.6817, 1.2844],
  [103.665, 1.2856],
  [103.6511, 1.2822],
  [103.64, 1.2744],
  [103.6319, 1.2622],
  [103.6267, 1.2467],
  [103.6239, 1.2289],
  [103.6233, 1.2089],
  [103.6244, 1.1878],
  [103.6267, 1.1667],
  [103.6094, 1.1587], // Close polygon
];
