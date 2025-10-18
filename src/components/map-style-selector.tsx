"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getMapStyleForStyle, type MapStyle } from "@/lib/map-styles";
import {
  Layers,
  Map as MapIcon,
  Moon,
  Mountain,
  Satellite,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface MapStyleSelectorProps {
  onStyleChange: (style: string) => void;
}

export function MapStyleSelector({ onStyleChange }: MapStyleSelectorProps) {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currentStyle, setCurrentStyle] = useState<MapStyle>("light");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" data-testid="map-style-selector">
        <Layers className="h-4 w-4" />
      </Button>
    );
  }

  const handleStyleChange = (style: MapStyle) => {
    setCurrentStyle(style);
    const mapStyle = getMapStyleForStyle(style);
    onStyleChange(mapStyle);

    // Theme relationship for visual contrast
    // Dark map → Light UI theme
    // All other maps → Dark UI theme
    if (style === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  const getStyleIcon = (style: MapStyle) => {
    switch (style) {
      case "light":
        return <Sun className="h-4 w-4" />;
      case "dark":
        return <Moon className="h-4 w-4" />;
      case "satellite":
        return <Satellite className="h-4 w-4" />;
      case "satelliteStreets":
        return <MapIcon className="h-4 w-4" />;
      case "outdoors":
        return <Mountain className="h-4 w-4" />;
      default:
        return <Layers className="h-4 w-4" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          data-testid="map-style-selector"
          className="bg-gray-900/95 text-white border-gray-700 hover:bg-gray-800/95 dark:bg-white/95 dark:text-gray-900 dark:border-gray-200 dark:hover:bg-gray-100/95"
        >
          {getStyleIcon(currentStyle)}
          <span className="sr-only">Map style</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-gray-900/95 border-gray-700 dark:bg-white/95 dark:border-gray-200"
      >
        <DropdownMenuItem
          onClick={() => handleStyleChange("light")}
          className="text-white hover:bg-gray-800 dark:text-gray-900 dark:hover:bg-gray-100"
        >
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStyleChange("dark")}
          className="text-white hover:bg-gray-800 dark:text-gray-900 dark:hover:bg-gray-100"
        >
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStyleChange("satellite")}
          className="text-white hover:bg-gray-800 dark:text-gray-900 dark:hover:bg-gray-100"
        >
          <Satellite className="mr-2 h-4 w-4" />
          Satellite
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStyleChange("satelliteStreets")}
          className="text-white hover:bg-gray-800 dark:text-gray-900 dark:hover:bg-gray-100"
        >
          <MapIcon className="mr-2 h-4 w-4" />
          Satellite Streets
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStyleChange("outdoors")}
          className="text-white hover:bg-gray-800 dark:text-gray-900 dark:hover:bg-gray-100"
        >
          <Mountain className="mr-2 h-4 w-4" />
          Outdoors
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
