"use client";

import { useEffect } from "react";
import { toastNotifications } from "@/hooks/use-toast";

interface ErrorToastHandlerProps {
  singaporeLocationsCount: number;
  staticMapUrl: string;
}

export function ErrorToastHandler({
  singaporeLocationsCount,
  staticMapUrl,
}: ErrorToastHandlerProps) {
  useEffect(() => {
    // Show warning if Singapore locations are empty
    if (singaporeLocationsCount === 0) {
      toastNotifications.warning(
        "Singapore locations service unavailable - using fallback data",
      );
    }

    // Note: currentLocation check removed - use "Locate Me" button for GPS location

    // Show error if static map is using placeholder
    if (staticMapUrl.includes("placeholder")) {
      toastNotifications.error(
        "Map service unavailable - showing placeholder image",
      );
    }
  }, [singaporeLocationsCount, staticMapUrl]);

  return null; // This component doesn't render anything
}
