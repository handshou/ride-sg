"use client";

import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
  useTheme,
} from "next-themes";
import { useEffect, useState } from "react";
import { logger } from "@/lib/client-logger";
import { getTimeBasedTheme } from "@/lib/services/theme-sync-service";

/**
 * Custom hook to set theme based on time on initial load
 * Only applies auto-theme if user hasn't manually selected a theme
 * Uses ThemeSyncService for centralized time-based theme logic
 */
function useAutoTheme() {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Wait a tick for next-themes to initialize
    const timeout = setTimeout(() => {
      const storedTheme = localStorage.getItem("theme");

      // Only auto-set theme on first visit (no stored theme yet)
      // After user makes a choice, respect it
      if (!storedTheme) {
        const timeBasedTheme = getTimeBasedTheme();
        const hour = new Date().getHours();

        setTheme(timeBasedTheme);
        logger.info(
          `🎨 Auto-theme (first visit): ${timeBasedTheme} (hour: ${hour})`,
        );
      } else {
        logger.debug(`🎨 Using stored theme: ${storedTheme}`);
      }
    }, 100); // Small delay to let next-themes initialize

    return () => clearTimeout(timeout);
  }, [mounted, setTheme]);
}

/**
 * Auto-theme wrapper component
 */
function AutoThemeWrapper({ children }: { children: React.ReactNode }) {
  useAutoTheme();
  return <>{children}</>;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <AutoThemeWrapper>{children}</AutoThemeWrapper>
    </NextThemesProvider>
  );
}
