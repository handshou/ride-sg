"use client";

import { usePathname } from "next/navigation";

export type City = "singapore" | "jakarta";

export interface CityContextValue {
  city: City;
  isJakarta: boolean;
  isSingapore: boolean;
  countryCode: "SG" | "ID";
  cityLabel: string;
  countryLabel: string;
}

export function useCityContext(): CityContextValue {
  const pathname = usePathname();
  const city: City = pathname.includes("jakarta") ? "jakarta" : "singapore";

  return {
    city,
    isJakarta: city === "jakarta",
    isSingapore: city === "singapore",
    countryCode: city === "jakarta" ? "ID" : "SG",
    cityLabel: city === "jakarta" ? "Jakarta" : "Singapore",
    countryLabel: city === "jakarta" ? "Indonesia" : "Singapore",
  };
}
