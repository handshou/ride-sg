"use client";

import { useEffect } from "react";
import { toastNotifications } from "@/lib/toast-hook";

interface ErrorToastHandlerProps {
  singaporeLocationsCount: number;
  currentLocationCount: number;
  staticMapUrl: string;
}

export function ErrorToastHandler({
  singaporeLocationsCount,
  currentLocationCount,
  staticMapUrl,
}: ErrorToastHandlerProps) {
  useEffect(() => {
    // Show warning if Singapore locations are empty
    if (singaporeLocationsCount === 0) {
      toastNotifications.warning(
        "Singapore locations service unavailable - using fallback data",
      );
    }

    // Show warning if current location is empty
    if (currentLocationCount === 0) {
      toastNotifications.warning(
        "Current location service unavailable - using fallback data",
      );
    }

    // Show error if static map is using placeholder
    if (staticMapUrl.includes("placeholder")) {
      toastNotifications.error(
        "Map service unavailable - showing placeholder image",
      );
    }
  }, [singaporeLocationsCount, currentLocationCount, staticMapUrl]);

  return null; // This component doesn't render anything
}
