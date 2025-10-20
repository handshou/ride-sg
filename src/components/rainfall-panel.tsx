"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useQuery } from "convex/react";
import { ChevronDown, ChevronUp, Droplets } from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

interface RainfallPanelProps {
  onStationClick?: (latitude: number, longitude: number) => void;
  useMockData?: boolean;
}

/**
 * Rainfall Panel
 *
 * Displays real-time rainfall data in a collapsible panel.
 * Shows:
 * - Last update time
 * - Station list sorted by rainfall (descending)
 * - Color indicators matching heat map
 * - Loading/empty states
 */
export function RainfallPanel({
  onStationClick,
  useMockData,
}: RainfallPanelProps) {
  const rainfallData = useQuery(api.rainfall.getLatestRainfall, {
    useMockData: useMockData || false,
  });
  const [isExpanded, setIsExpanded] = useState(false);

  // Get rainfall color based on value
  const getRainfallColor = (value: number): string => {
    if (value === 0) return "text-gray-400 dark:text-gray-500";
    if (value < 5) return "text-blue-500 dark:text-blue-400";
    if (value < 10) return "text-green-500 dark:text-green-400";
    if (value < 20) return "text-yellow-500 dark:text-yellow-400";
    return "text-red-500 dark:text-red-400";
  };

  // Get rainfall intensity label
  const getRainfallLabel = (value: number): string => {
    if (value === 0) return "No rain";
    if (value < 5) return "Light";
    if (value < 10) return "Moderate";
    if (value < 20) return "Heavy";
    return "Very Heavy";
  };

  // Sort by rainfall value (descending)
  const sortedData = rainfallData
    ? [...rainfallData].sort((a, b) => b.value - a.value)
    : [];

  // Get update timestamp
  const lastUpdate = rainfallData?.[0]?.timestamp
    ? new Date(rainfallData[0].timestamp).toLocaleTimeString()
    : "N/A";

  // Count active rainfall stations
  const activeStations = sortedData.filter((s) => s.value > 0).length;
  const totalStations = sortedData.length;

  return (
    <div className="absolute bottom-10 left-4 z-20 w-80 rounded-lg bg-white/90 shadow-lg backdrop-blur-md dark:bg-gray-800/90">
      {/* Header - Always visible */}
      <div
        role="button"
        tabIndex={0}
        className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-blue-500" />
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white">
              Rainfall
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {!rainfallData ? (
                "Loading..."
              ) : (
                <>
                  {activeStations} active / {totalStations} stations
                </>
              )}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last update: {lastUpdate}
            </p>
          </div>

          {/* Station List */}
          <div className="max-h-96 overflow-y-auto">
            {!rainfallData ? (
              <div className="flex items-center justify-center p-8">
                <Spinner className="h-6 w-6" />
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  Loading rainfall data...
                </span>
              </div>
            ) : sortedData.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No rainfall data available
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {sortedData.map((station) => (
                  <div
                    key={station.stationId}
                    role={onStationClick ? "button" : undefined}
                    tabIndex={onStationClick ? 0 : undefined}
                    className={`flex items-center justify-between rounded-md p-2 transition-colors ${
                      onStationClick
                        ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                        : ""
                    }`}
                    onClick={() =>
                      onStationClick?.(station.latitude, station.longitude)
                    }
                    onKeyDown={(e) => {
                      if (
                        onStationClick &&
                        (e.key === "Enter" || e.key === " ")
                      ) {
                        e.preventDefault();
                        onStationClick(station.latitude, station.longitude);
                      }
                    }}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-white">
                        {station.stationName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {getRainfallLabel(station.value)}
                      </p>
                    </div>
                    <div
                      className={`text-right font-semibold ${getRainfallColor(station.value)}`}
                    >
                      <span className="text-lg">
                        {station.value.toFixed(1)}
                      </span>
                      <span className="ml-1 text-xs">mm</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
