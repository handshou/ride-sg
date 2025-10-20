"use client";

import { Badge } from "@/components/ui/badge";
import type { BicycleParkingResult } from "@/lib/schema/bicycle-parking.schema";
import { Bike, CircleDot, Heart, Home } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface BicycleParkingPanelProps {
  parkingResults: BicycleParkingResult[];
  isLoading: boolean;
  onParkingSelect: (result: BicycleParkingResult) => void;
  selectedParking: BicycleParkingResult | null;
}

export function BicycleParkingPanel({
  parkingResults,
  isLoading,
  onParkingSelect,
  selectedParking,
}: BicycleParkingPanelProps) {
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [savedBicycleParkingIds, setSavedBicycleParkingIds] = useState<
    Set<string>
  >(new Set());

  // Load saved bicycle parking IDs on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("savedBicycleParkingIds");
      if (saved) {
        setSavedBicycleParkingIds(new Set(JSON.parse(saved)));
      }
    }
  }, []);

  const handleSaveBicycleParking = (
    result: BicycleParkingResult,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation(); // Prevent triggering the parent button click

    const newSavedIds = new Set(savedBicycleParkingIds);

    if (newSavedIds.has(result.id)) {
      // Remove from saved
      newSavedIds.delete(result.id);

      // Remove from localStorage locations array
      const savedLocations: BicycleParkingResult[] = JSON.parse(
        localStorage.getItem("savedBicycleParkingLocations") || "[]",
      );
      const updatedLocations = savedLocations.filter(
        (loc) => loc.id !== result.id,
      );
      localStorage.setItem(
        "savedBicycleParkingLocations",
        JSON.stringify(updatedLocations),
      );

      toast.info("Removed from saved bicycle parking");
    } else {
      // Add to saved
      newSavedIds.add(result.id);

      // Save full result to localStorage
      const savedLocations: BicycleParkingResult[] = JSON.parse(
        localStorage.getItem("savedBicycleParkingLocations") || "[]",
      );
      savedLocations.push(result);
      localStorage.setItem(
        "savedBicycleParkingLocations",
        JSON.stringify(savedLocations),
      );

      toast.success("Saved bicycle parking location");
    }

    // Update IDs in localStorage
    localStorage.setItem(
      "savedBicycleParkingIds",
      JSON.stringify([...newSavedIds]),
    );
    setSavedBicycleParkingIds(newSavedIds);

    // Trigger a custom event to notify the overlay to re-render
    window.dispatchEvent(new Event("savedBicycleParkingChanged"));
  };

  // Scroll to selected item when it changes
  useEffect(() => {
    if (selectedParking) {
      const element = itemRefs.current.get(selectedParking.id);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [selectedParking]);

  if (parkingResults.length === 0 && !isLoading) {
    return null; // Hide panel when no results
  }

  return (
    <div className="absolute top-20 right-[95px] z-20 w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Bike className="h-5 w-5 text-green-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Bicycle Parking
          </h2>
        </div>
      </div>

      {/* Results List */}
      <div className="overflow-y-auto flex-1">
        {isLoading && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <CircleDot className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Finding bicycle parking...</p>
          </div>
        )}

        {!isLoading && parkingResults.length > 0 && (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {parkingResults.map((result) => {
              const isSelected = selectedParking?.id === result.id;
              const rackSizeLabel =
                result.rackCount <= 10
                  ? "Small"
                  : result.rackCount <= 30
                    ? "Medium"
                    : "Large";

              return (
                <button
                  key={result.id}
                  ref={(el) => {
                    if (el) {
                      itemRefs.current.set(result.id, el);
                    } else {
                      itemRefs.current.delete(result.id);
                    }
                  }}
                  type="button"
                  onClick={() => onParkingSelect(result)}
                  className={`w-full p-4 text-left transition-colors ${
                    isSelected
                      ? "bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CircleDot
                          className={`flex-shrink-0 ${
                            result.rackCount <= 10
                              ? "h-3 w-3"
                              : result.rackCount <= 30
                                ? "h-4 w-4"
                                : "h-5 w-5"
                          } text-green-500`}
                        />
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {result.description}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          <Bike className="h-3 w-3 mr-1" />
                          {result.rackCount} racks ({rackSizeLabel})
                        </Badge>

                        {result.hasShelter && (
                          <Badge
                            variant="default"
                            className="text-xs bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Home className="h-3 w-3 mr-1" />
                            Sheltered
                          </Badge>
                        )}

                        {!result.hasShelter && (
                          <Badge variant="secondary" className="text-xs">
                            No shelter
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {result.rackType}
                      </p>
                    </div>

                    {/* Save button */}
                    <button
                      type="button"
                      onClick={(e) => handleSaveBicycleParking(result, e)}
                      className={`p-2 rounded-md transition-all flex-shrink-0 ${
                        savedBicycleParkingIds.has(result.id)
                          ? "text-red-500 dark:text-red-400"
                          : "text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                      }`}
                      title={
                        savedBicycleParkingIds.has(result.id)
                          ? "Saved"
                          : "Save bicycle parking location"
                      }
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          savedBicycleParkingIds.has(result.id)
                            ? "fill-current"
                            : ""
                        }`}
                      />
                    </button>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {!isLoading && parkingResults.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-600 dark:text-gray-400">
          Found {parkingResults.length} bicycle parking location
          {parkingResults.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
