/**
 * Utility functions for calculating directions and bearings between geographic points
 */

/**
 * Calculate the bearing (direction) from one point to another
 * @param from Starting point with latitude and longitude
 * @param to Destination point with latitude and longitude
 * @returns Bearing in degrees (0-360, where 0 is North, 90 is East, etc.)
 */
export function calculateBearing(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const dLon = (to.longitude - from.longitude) * (Math.PI / 180);
  const lat1 = from.latitude * (Math.PI / 180);
  const lat2 = to.latitude * (Math.PI / 180);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const bearing = Math.atan2(y, x) * (180 / Math.PI);

  // Normalize to 0-360 degrees
  return (bearing + 360) % 360;
}

/**
 * Calculate the distance between two points using the Haversine formula
 * @param from Starting point
 * @param to Destination point
 * @returns Distance in meters
 */
export function calculateDistance(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = from.latitude * (Math.PI / 180);
  const lat2 = to.latitude * (Math.PI / 180);
  const dLat = (to.latitude - from.latitude) * (Math.PI / 180);
  const dLon = (to.longitude - from.longitude) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Convert bearing to compass direction
 * @param bearing Bearing in degrees (0-360)
 * @returns Compass direction string
 */
export function bearingToCompass(bearing: number): string {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
}

/**
 * Format distance for display
 * @param meters Distance in meters
 * @returns Formatted string with appropriate units
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Calculate the relative bearing from device heading to target
 * @param deviceHeading Current device compass heading (0-360)
 * @param targetBearing Bearing to target from current position (0-360)
 * @returns Relative bearing (-180 to 180, where 0 is straight ahead)
 */
export function calculateRelativeBearing(
  deviceHeading: number,
  targetBearing: number,
): number {
  let relative = targetBearing - deviceHeading;

  // Normalize to -180 to 180
  if (relative > 180) {
    relative -= 360;
  } else if (relative < -180) {
    relative += 360;
  }

  return relative;
}

/**
 * Get arrow rotation for directional indicator
 * @param relativeBearing Relative bearing from device heading (-180 to 180)
 * @returns CSS rotation value in degrees
 */
export function getArrowRotation(relativeBearing: number): number {
  // Arrow pointing up by default, rotate based on relative bearing
  return relativeBearing;
}

/**
 * Determine if an object is within the camera's field of view
 * @param relativeBearing Relative bearing to object (-180 to 180)
 * @param fov Camera field of view in degrees (default 60)
 * @returns True if object is likely in view
 */
export function isInFieldOfView(
  relativeBearing: number,
  fov: number = 60,
): boolean {
  const halfFov = fov / 2;
  return Math.abs(relativeBearing) <= halfFov;
}

/**
 * Get directional description for UI display
 * @param relativeBearing Relative bearing (-180 to 180)
 * @param distance Distance in meters
 * @returns Human-readable direction string
 */
export function getDirectionalDescription(
  relativeBearing: number,
  distance: number,
): string {
  const distanceStr = formatDistance(distance);

  if (Math.abs(relativeBearing) < 15) {
    return `Straight ahead, ${distanceStr}`;
  } else if (Math.abs(relativeBearing) < 45) {
    return relativeBearing > 0
      ? `Slightly right, ${distanceStr}`
      : `Slightly left, ${distanceStr}`;
  } else if (Math.abs(relativeBearing) < 90) {
    return relativeBearing > 0
      ? `To your right, ${distanceStr}`
      : `To your left, ${distanceStr}`;
  } else if (Math.abs(relativeBearing) < 135) {
    return relativeBearing > 0
      ? `Behind right, ${distanceStr}`
      : `Behind left, ${distanceStr}`;
  } else {
    return `Behind you, ${distanceStr}`;
  }
}

/**
 * Combine device compass heading with camera orientation
 * @param deviceHeading Device compass heading (0-360)
 * @param cameraOrientation Camera orientation if different from device
 * @returns Adjusted heading for camera view
 */
export function getCameraHeading(
  deviceHeading: number,
  cameraOrientation: "portrait" | "landscape" = "portrait",
): number {
  // In landscape mode, the camera is rotated 90 degrees
  if (cameraOrientation === "landscape") {
    return (deviceHeading + 90) % 360;
  }
  return deviceHeading;
}
