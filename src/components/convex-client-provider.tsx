"use client";

import { logger } from "@/lib/client-logger";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo } from "react";

interface ConvexClientProviderProps {
  children: React.ReactNode;
}

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  // Initialize Convex client immediately on mount (no state needed)
  const convex = useMemo(() => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

    if (!convexUrl) {
      logger.warn(
        "NEXT_PUBLIC_CONVEX_URL not configured, Convex features will be disabled",
      );
      return null;
    }

    // Only create client in browser environment
    if (typeof window === "undefined") {
      return null;
    }

    logger.info(`Initializing Convex client: ${convexUrl}`);
    return new ConvexReactClient(convexUrl);
  }, []);

  // If Convex is not configured or not in browser, still render children
  // but without ConvexProvider (graceful degradation for SSR/SSG)
  if (!convex) {
    return <>{children}</>;
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
