"use client";

import { Button } from "@/components/ui/button";
import { Info, X } from "lucide-react";
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

            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <p>
                <strong>🔍 Search:</strong> Type a location name to find places
                in Singapore
              </p>
              <p>
                <strong>❤️ Save:</strong> Click the heart icon on search results
                to add them to your randomized list
              </p>
              <p>
                <strong>🎲 Random:</strong> Click the dice icon to visit a saved
                location (or random spot if none saved)
              </p>
              <p>
                <strong>📍 Locate:</strong> Click the compass to find your
                current location
              </p>
              <p>
                <strong>🚲 Bicycle Parking:</strong> Click any bicycle marker to
                see parking details. Click results in the panel to save locally.
              </p>
              <p>
                <strong>🎨 Map Style:</strong> Click the layers icon to switch
                between map styles
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
