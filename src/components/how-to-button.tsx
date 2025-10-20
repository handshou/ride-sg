"use client";

import { Button } from "@/components/ui/button";
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
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4"
          onClick={() => setIsOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {/* Header - Fixed */}
            <div className="flex-shrink-0 p-4 sm:p-6 pb-3 sm:pb-4 border-b border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white pr-8">
                How to Use Ride-SG
              </h2>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-3 sm:pt-4">
              <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Layers className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-gray-600 dark:text-gray-400 mt-0.5" />
                  <div>
                    <strong>Map Style:</strong> Switch between different map
                    views (satellite, streets, dark, light)
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3">
                  <Dices className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-gray-600 dark:text-gray-400 mt-0.5" />
                  <div>
                    <strong>Navigate:</strong> Cycles through your saved
                    locations in shuffled order. Falls back to random Singapore
                    spots if none saved.
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3">
                  <Navigation className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-gray-600 dark:text-gray-400 mt-0.5" />
                  <div>
                    <strong>Locate Me:</strong> Find and navigate to your
                    current location
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-gray-600 dark:text-gray-400 mt-0.5" />
                  <div className="flex items-center gap-1 flex-wrap">
                    <span>
                      <strong>Search:</strong> Type a location name to find
                      places in Singapore. Results from
                    </span>
                    <Database className="h-3 w-3" />
                    <span>and</span>
                    <Exa.Combine
                      size={12}
                      style={{
                        display: "inline-block",
                        verticalAlign: "middle",
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3">
                  <Heart className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-red-500 dark:text-red-400 fill-current mt-0.5" />
                  <div>
                    <strong>Save:</strong> Click the heart on search results to
                    add them to your randomized list. Blue pins show saved
                    locations on the map.
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3">
                  <Bike className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-green-500 mt-0.5" />
                  <div>
                    <strong>Bicycle Parking:</strong> Green bicycle icons show
                    parking locations. Click markers or panel results to view
                    details. Save with{" "}
                    <Heart className="inline h-3 w-3 text-red-500 fill-current" />{" "}
                    for red pin markers
                  </div>
                </div>
              </div>

              {/* Footer - Privacy notice */}
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                  <strong>Privacy:</strong> We do not store any data except when
                  you click save (❤️) on a location search result. Saved bicycle
                  parking is stored locally in your browser.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
