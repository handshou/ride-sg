"use client";

import { CloudRain } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RainfallToggleButtonProps {
  isActive: boolean;
  onClick: () => void;
}

/**
 * Rainfall Toggle Button
 *
 * Button with rain icon for showing/hiding the rainfall heat map layer.
 * Displays active state indicator.
 */
export function RainfallToggleButton({
  isActive,
  onClick,
}: RainfallToggleButtonProps) {
  return (
    <Button
      variant={isActive ? "default" : "outline"}
      size="icon"
      onClick={onClick}
      className={`relative h-10 w-10 shadow-md transition-all ${
        isActive
          ? "bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
          : "bg-white/95 text-gray-900 border-gray-300 hover:bg-gray-100/95 dark:bg-gray-900/95 dark:text-white dark:border-gray-700 dark:hover:bg-gray-800/95"
      }`}
      title={isActive ? "Hide rainfall layer" : "Show rainfall layer"}
    >
      <CloudRain className="h-5 w-5" />
      {isActive && (
        <span className="absolute -right-1 -top-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
        </span>
      )}
    </Button>
  );
}
