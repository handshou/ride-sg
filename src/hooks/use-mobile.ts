"use client";

import { useEffect, useState } from "react";

/**
 * Detect if device is mobile (can be called before mount)
 */
function detectMobile(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.innerWidth < 768 ||
    ("ontouchstart" in window && window.innerWidth < 1024)
  );
}

/**
 * Hook to detect if the device is mobile
 * Uses window width and touch capability
 * Initializes with immediate detection to avoid hydration issues
 */
export function useMobile() {
  // Initialize with actual mobile detection instead of false
  const [isMobile, setIsMobile] = useState(() => {
    const initial = detectMobile();
    console.log("📱 useMobile initial detection:", initial, {
      width: typeof window !== "undefined" ? window.innerWidth : "N/A",
      hasTouch:
        typeof window !== "undefined" ? "ontouchstart" in window : "N/A",
    });
    return initial;
  });

  useEffect(() => {
    const checkMobile = () => {
      const mobile = detectMobile();
      console.log("📱 useMobile effect check:", mobile, {
        width: window.innerWidth,
        hasTouch: "ontouchstart" in window,
      });
      setIsMobile(mobile);
    };

    // Check on mount (in case window wasn't available during useState init)
    checkMobile();

    // Check on resize
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  console.log("📱 useMobile render, returning:", isMobile);
  return isMobile;
}
