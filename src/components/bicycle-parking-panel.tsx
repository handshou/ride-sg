"use client";

import { Bike, CircleDot, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BicycleParkingResult } from "@/lib/schema/bicycle-parking.schema";

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
  if (parkingResults.length === 0 && !isLoading) {
    return null; // Hide panel when no results
  }

  return (
    <div className="absolute top-20 right-4 z-20 w-80 bg-gray-900/95 dark:bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 dark:border-gray-200 max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 dark:border-gray-200">
        <div className="flex items-center gap-2">
          <Bike className="h-5 w-5 text-green-500" />
          <h2 className="font-semibold text-white dark:text-gray-900">
            Bicycle Parking
          </h2>
        </div>
      </div>

      {/* Results List */}
      <div className="overflow-y-auto flex-1">
        {isLoading && (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">
            <CircleDot className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Finding bicycle parking...</p>
          </div>
        )}

        {!isLoading && parkingResults.length > 0 && (
          <div className="divide-y divide-gray-700 dark:divide-gray-200">
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
                  type="button"
                  onClick={() => onParkingSelect(result)}
                  className={`w-full p-4 text-left transition-colors ${
                    isSelected
                      ? "bg-green-900/20 dark:bg-green-50 border-l-4 border-green-500"
                      : "hover:bg-gray-800/50 dark:hover:bg-gray-50"
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
                        <h3 className="font-medium text-white dark:text-gray-900 truncate">
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
                            className="text-xs bg-blue-600"
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

                      <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                        {result.rackType}
                      </p>

                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {result.latitude.toFixed(4)},{" "}
                        {result.longitude.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {!isLoading && parkingResults.length > 0 && (
        <div className="p-3 border-t border-gray-700 dark:border-gray-200 bg-gray-800/50 dark:bg-gray-50 text-sm text-gray-400 dark:text-gray-600">
          Found {parkingResults.length} bicycle parking location
          {parkingResults.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
