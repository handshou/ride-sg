import { logger } from "@/lib/client-logger";

export type DetectedCity = "singapore" | "jakarta" | "unknown";

/**
 * Detect which city a set of coordinates is in using Mapbox reverse geocoding
 */
export async function detectCityFromCoords(
  latitude: number,
  longitude: number,
  mapboxToken: string,
): Promise<DetectedCity> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}&types=place,country`,
    );

    if (!response.ok) {
      logger.error("Mapbox reverse geocoding failed", {
        status: response.status,
      });
      return "unknown";
    }

    const data = await response.json();

    // Look for country or place in the features
    const features = data.features || [];

    for (const feature of features) {
      const placeName = feature.place_name?.toLowerCase() || "";
      const text = feature.text?.toLowerCase() || "";

      // Check for Singapore
      if (
        placeName.includes("singapore") ||
        text.includes("singapore") ||
        feature.properties?.short_code === "sg"
      ) {
        logger.info("Detected location: Singapore", { latitude, longitude });
        return "singapore";
      }

      // Check for Jakarta
      if (
        placeName.includes("jakarta") ||
        text.includes("jakarta") ||
        placeName.includes("indonesia")
      ) {
        // Further verify it's actually Jakarta by checking coordinates
        // Jakarta is roughly: -6.4 to -6.1 latitude, 106.68 to 107.00 longitude
        if (
          latitude >= -6.4 &&
          latitude <= -6.1 &&
          longitude >= 106.68 &&
          longitude <= 107.0
        ) {
          logger.info("Detected location: Jakarta", { latitude, longitude });
          return "jakarta";
        }
      }
    }

    // If we found Indonesia but not Jakarta specifically, check coordinates
    const isInJakartaBounds =
      latitude >= -6.4 &&
      latitude <= -6.1 &&
      longitude >= 106.68 &&
      longitude <= 107.0;

    if (isInJakartaBounds) {
      logger.info("Detected location: Jakarta (by coordinates)", {
        latitude,
        longitude,
      });
      return "jakarta";
    }

    // Check Singapore bounds as fallback
    const isInSingaporeBounds =
      latitude >= 1.16 &&
      latitude <= 1.47 &&
      longitude >= 103.6 &&
      longitude <= 104.0;

    if (isInSingaporeBounds) {
      logger.info("Detected location: Singapore (by coordinates)", {
        latitude,
        longitude,
      });
      return "singapore";
    }

    logger.info("Location not in Singapore or Jakarta", {
      latitude,
      longitude,
    });
    return "unknown";
  } catch (error) {
    logger.error("Error detecting city from coordinates", error);
    return "unknown";
  }
}
