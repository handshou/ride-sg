"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect if the device is mobile
 * Uses window width and touch capability
 */
export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Check if window width is mobile-sized (less than 768px) or if touch is available
      const mobile =
        window.innerWidth < 768 ||
        ("ontouchstart" in window && window.innerWidth < 1024);
      setIsMobile(mobile);
    };

    // Check on mount
    checkMobile();

    // Check on resize
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}
