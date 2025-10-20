"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getMapStyleForStyle, type MapStyle } from "@/lib/map-styles";
import { Layers, Moon, Mountain, Satellite, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface MapStyleSelectorProps {
  onStyleChange: (style: string) => void;
}

export function MapStyleSelector({ onStyleChange }: MapStyleSelectorProps) {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [_currentStyle, setCurrentStyle] =
    useState<MapStyle>("satelliteStreets"); // Match default map style

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        data-testid="map-style-selector"
        className="h-10 w-10 bg-white/95 text-gray-900 border-gray-300 shadow-md"
      >
        <Layers className="h-5 w-5" />
      </Button>
    );
  }

  const handleStyleChange = (style: MapStyle) => {
    setCurrentStyle(style);
    const mapStyle = getMapStyleForStyle(style);
    onStyleChange(mapStyle);

    // Theme relationship: match map style to UI theme
    // Dark map → Dark UI theme
    // Light map → Light UI theme
    // Satellite/Outdoors → Light UI theme (lighter backgrounds)
    if (style === "dark") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          data-testid="map-style-selector"
          className="h-10 w-10 bg-white/95 text-gray-900 border-gray-300 hover:bg-gray-100/95 shadow-md dark:bg-gray-900/95 dark:text-white dark:border-gray-700 dark:hover:bg-gray-800/95"
          title="Change map style"
        >
          <Layers className="h-5 w-5" />
          <span className="sr-only">Map style</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-white/95 border-gray-200 dark:bg-gray-900/95 dark:border-gray-700"
      >
        <DropdownMenuItem
          onClick={() => handleStyleChange("light")}
          className="text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800"
        >
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStyleChange("dark")}
          className="text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800"
        >
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStyleChange("satellite")}
          className="text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800"
        >
          <Satellite className="mr-2 h-4 w-4" />
          Satellite
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStyleChange("satelliteStreets")}
          className="text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800"
        >
          <Satellite className="mr-2 h-4 w-4" />
          Satellite Streets
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStyleChange("outdoors")}
          className="text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800"
        >
          <Mountain className="mr-2 h-4 w-4" />
          Outdoors
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
