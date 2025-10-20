"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useEffect, useState } from "react";
import { logger } from "@/lib/client-logger";

interface ConvexClientProviderProps {
  children: React.ReactNode;
}

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const [convex, setConvex] = useState<ConvexReactClient | null>(null);

  // Initialize Convex client only on the client side
  useEffect(() => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

    if (!convexUrl) {
      logger.warn(
        "NEXT_PUBLIC_CONVEX_URL not configured, Convex features will be disabled",
      );
      // Create a dummy client to prevent errors
      const dummyClient = new ConvexReactClient("https://dummy.convex.cloud");
      setConvex(dummyClient);
      return;
    }

    logger.info(`Initializing Convex client: ${convexUrl}`);
    const client = new ConvexReactClient(convexUrl);
    setConvex(client);

    // Cleanup on unmount
    return () => {
      client.close();
    };
  }, []);

  // Don't render until we have a client (prevents useQuery errors)
  if (!convex) {
    return null;
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
