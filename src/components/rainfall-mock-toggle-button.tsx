"use client";

import { Button } from "@/components/ui/button";
import { FlaskConical } from "lucide-react";

interface RainfallMockToggleButtonProps {
  isMockMode: boolean;
  onClick: () => void;
}

/**
 * Rainfall Mock Data Toggle Button
 *
 * Button to toggle between real and mock rainfall data for testing/demo.
 * Shows a flask icon with active state when mock mode is enabled.
 */
export function RainfallMockToggleButton({
  isMockMode,
  onClick,
}: RainfallMockToggleButtonProps) {
  return (
    <Button
      variant={isMockMode ? "default" : "outline"}
      size="icon"
      onClick={onClick}
      className={`relative h-10 w-10 shadow-md transition-all ${
        isMockMode
          ? "bg-purple-500 text-white hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700"
          : "bg-white/95 text-gray-900 border-gray-300 hover:bg-gray-100/95 dark:bg-gray-900/95 dark:text-white dark:border-gray-700 dark:hover:bg-gray-800/95"
      }`}
      title={
        isMockMode
          ? "Using mock data (click to use real data)"
          : "Using real data (click to use mock data)"
      }
    >
      <FlaskConical className="h-5 w-5" />
      {isMockMode && (
        <span className="absolute -right-1 -top-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-purple-500" />
        </span>
      )}
    </Button>
  );
}
