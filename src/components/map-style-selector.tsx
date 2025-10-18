"use client";

import {
  Layers,
  Map as MapIcon,
  Moon,
  Mountain,
  Satellite,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getMapStyleForStyle, type MapStyle } from "@/lib/map-styles";

interface MapStyleSelectorProps {
  onStyleChange: (style: string) => void;
}

export function MapStyleSelector({ onStyleChange }: MapStyleSelectorProps) {
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
        <Button variant="outline" size="sm" data-testid="map-style-selector">
          {getStyleIcon(currentStyle)}
          <span className="sr-only">Map style</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleStyleChange("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStyleChange("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStyleChange("satellite")}>
          <Satellite className="mr-2 h-4 w-4" />
          Satellite
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStyleChange("satelliteStreets")}>
          <MapIcon className="mr-2 h-4 w-4" />
          Satellite Streets
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStyleChange("outdoors")}>
          <Mountain className="mr-2 h-4 w-4" />
          Outdoors
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
