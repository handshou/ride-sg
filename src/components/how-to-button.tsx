"use client";

import { Exa } from "@lobehub/icons";
import {
  Bike,
  Database,
  Dices,
  Heart,
  Info,
  Layers,
  Navigation,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function HowToButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="icon"
        className="h-10 w-10 bg-white/95 text-gray-900 border-gray-300 hover:bg-gray-100/95 shadow-md dark:bg-gray-900/95 dark:text-white dark:border-gray-700 dark:hover:bg-gray-800/95"
        title="How to use this app"
      >
        <Info className="h-5 w-5" />
      </Button>

      {isOpen && (
        // biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop is a common pattern
        <div
          role="presentation"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              How to Use Ride-SG
            </h2>

            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-3">
                <Layers className="h-5 w-5 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                <div>
                  <strong>Map Style:</strong> Switch between different map views
                  (satellite, streets, dark, light)
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Dices className="h-5 w-5 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                <div>
                  <strong>Random:</strong> Visit a saved location, or explore a
                  random spot in Singapore if none saved
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Navigation className="h-5 w-5 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                <div>
                  <strong>Locate Me:</strong> Find and navigate to your current
                  location
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Search className="h-5 w-5 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                <div>
                  <strong>Search:</strong> Type a location name to find places
                  in Singapore. Results from{" "}
                  <Database className="inline h-3 w-3" /> Convex (cached) and{" "}
                  <Exa.Combine className="inline h-3 w-3" /> Exa (AI search)
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Heart className="h-5 w-5 flex-shrink-0 text-red-500 dark:text-red-400 fill-current" />
                <div>
                  <strong>Save:</strong> Click the heart on search results to
                  add them to your randomized list. Blue pins show saved
                  locations on the map.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Bike className="h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <strong>Bicycle Parking:</strong> Green bicycle icons show
                  parking locations. Click markers or panel results to view
                  details. Save with{" "}
                  <Heart className="inline h-3 w-3 text-red-500 fill-current" />{" "}
                  for red pin markers
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
