"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useEffect, useMemo, useState } from "react";

interface ConvexClientProviderProps {
  children: React.ReactNode;
}

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Only initialize Convex on client-side after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize Convex client immediately on mount (no state needed)
  const convex = useMemo(() => {
    // Skip during SSR
    if (!isMounted || typeof window === "undefined") {
      return null;
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

    if (!convexUrl) {
      console.warn(
        "⚠️ NEXT_PUBLIC_CONVEX_URL not configured, Convex features will be disabled",
      );
      return null;
    }

    console.log(`🔗 Initializing Convex client: ${convexUrl}`);
    return new ConvexReactClient(convexUrl);
  }, [isMounted]);

  // During SSR or if Convex is not configured, render without provider
  // This ensures ConvexProvider is ONLY used in the browser
  if (!isMounted || !convex) {
    return <>{children}</>;
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
