"use client";

import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Buildings3DToggleButtonProps {
  isActive: boolean;
  onClick: () => void;
}

/**
 * 3D Buildings Toggle Button
 *
 * Button with building icon for showing/hiding 3D building extrusions.
 */
export function Buildings3DToggleButton({
  isActive,
  onClick,
}: Buildings3DToggleButtonProps) {
  return (
    <Button
      variant={isActive ? "default" : "outline"}
      size="icon"
      onClick={onClick}
      className={`relative h-10 w-10 shadow-md transition-all ${
        isActive
          ? "bg-purple-500 text-white hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700"
          : "bg-white/95 text-gray-900 border-gray-300 hover:bg-gray-100/95 dark:bg-gray-900/95 dark:text-white dark:border-gray-700 dark:hover:bg-gray-800/95"
      }`}
      title={isActive ? "Hide 3D buildings" : "Show 3D buildings"}
    >
      <Building2 className="h-5 w-5" />
      {isActive && (
        <span className="absolute -right-1 -top-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-purple-500" />
        </span>
      )}
    </Button>
  );
}
