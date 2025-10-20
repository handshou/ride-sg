"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useEffect, useState } from "react";
import { logger } from "@/lib/client-logger";

interface ConvexClientProviderProps {
  children: React.ReactNode;
}

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const [convex, setConvex] = useState<ConvexReactClient | null>(null);

  useEffect(() => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    
    if (!convexUrl) {
      logger.warn("NEXT_PUBLIC_CONVEX_URL not configured, Convex features will be disabled");
      return;
    }

    logger.info(`Initializing Convex client with URL: ${convexUrl}`);
    const client = new ConvexReactClient(convexUrl);
    setConvex(client);

    return () => {
      client.close();
    };
  }, []);

  // If Convex is not configured or not ready, still render children
  // but without ConvexProvider (graceful degradation)
  if (!convex) {
    return <>{children}</>;
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

