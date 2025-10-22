"use client";

import { useEffect, useState } from "react";

/**
 * Detect if device is mobile (can be called before mount)
 * Only considers width, not touch capability (to avoid false positives on touchscreen laptops)
 */
function detectMobile(): boolean {
  if (typeof window === "undefined") return false;
  // Use only window width for detection (768px is common mobile breakpoint)
  return window.innerWidth < 768;
}

/**
 * Hook to detect if the device is mobile
 * Uses window width only (< 768px = mobile)
 * Initializes with immediate detection to avoid hydration issues
 */
export function useMobile() {
  // Initialize with actual mobile detection instead of false
  const [isMobile, setIsMobile] = useState(() => detectMobile());

  useEffect(() => {
    const checkMobile = () => {
      const mobile = detectMobile();
      setIsMobile(mobile);
    };

    // Check on mount (in case window wasn't available during useState init)
    checkMobile();

    // Check on resize
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}
