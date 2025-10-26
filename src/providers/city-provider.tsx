"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { logger } from "@/lib/client-logger";

export type City = "singapore" | "jakarta";

export interface CityContextValue {
  city: City;
  isJakarta: boolean;
  isSingapore: boolean;
  countryCode: "SG" | "ID";
  cityLabel: string;
  countryLabel: string;
  setCity: (city: City) => void;
}

const CityContext = createContext<CityContextValue | undefined>(undefined);

/**
 * Get city from current pathname
 */
function getCityFromPathname(): City {
  if (typeof window === "undefined") return "singapore";
  return window.location.pathname.includes("jakarta") ? "jakarta" : "singapore";
}

export function CityProvider({ children }: { children: ReactNode }) {
  const [city, setCityState] = useState<City>(getCityFromPathname);

  // Listen for URL changes (browser back/forward, manual pushState)
  useEffect(() => {
    const handleLocationChange = () => {
      const newCity = getCityFromPathname();
      if (newCity !== city) {
        logger.info(`City changed from URL: ${newCity}`);
        setCityState(newCity);
      }
    };

    // Listen for popstate (back/forward navigation)
    window.addEventListener("popstate", handleLocationChange);

    // Listen for custom city change events (from window.history.pushState)
    window.addEventListener("citychange", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("citychange", handleLocationChange);
    };
  }, [city]);

  // Update city and navigate to new URL using pushState (no full re-render)
  const setCity = (newCity: City) => {
    if (newCity === city) return;

    logger.info(`Setting city to: ${newCity} (using pushState)`);

    // Update URL using pushState (no page reload, minimal re-render)
    window.history.pushState({}, "", `/${newCity}`);

    // Dispatch custom event to notify listeners
    window.dispatchEvent(new Event("citychange"));

    // Update local state
    setCityState(newCity);
  };

  const value: CityContextValue = {
    city,
    isJakarta: city === "jakarta",
    isSingapore: city === "singapore",
    countryCode: city === "jakarta" ? "ID" : "SG",
    cityLabel: city === "jakarta" ? "Jakarta" : "Singapore",
    countryLabel: city === "jakarta" ? "Indonesia" : "Singapore",
    setCity,
  };

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCityContext(): CityContextValue {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error("useCityContext must be used within CityProvider");
  }
  return context;
}
