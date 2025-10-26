"use client";

import { useQuery } from "convex/react";
import { ChevronDown, ChevronUp, Droplets } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "../../convex/_generated/api";

interface RainfallPanelProps {
  initialRainfallData: Array<{
    stationId: string;
    stationName: string;
    latitude: number;
    longitude: number;
    value: number;
    timestamp: string;
    fetchedAt: number;
  }>;
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
 *
 * Data source:
 * - Uses initialRainfallData from server (NEA API → Convex fallback)
 * - Only queries Convex when useMockData is true for testing/demo
 */
export function RainfallPanel({
  initialRainfallData,
  onStationClick,
  useMockData,
}: RainfallPanelProps) {
  // Only query Convex when using mock data (for testing/demo)
  const mockDataFromConvex = useQuery(
    api.rainfall.getLatestRainfall,
    useMockData ? { useMockData: true } : "skip",
  );

  // Use mock data from Convex if requested, otherwise use server-fetched data
  const rainfallData = useMockData ? mockDataFromConvex : initialRainfallData;

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
      <button
        type="button"
        className={`flex w-full cursor-pointer items-center justify-between p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
          isExpanded ? "rounded-t-lg" : "rounded-lg"
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
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
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        )}
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="rounded-b-lg border-t border-gray-200 dark:border-gray-700">
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
                {sortedData.map((station) =>
                  onStationClick ? (
                    <button
                      key={station.stationId}
                      type="button"
                      className="flex w-full items-center justify-between rounded-md p-2 text-left transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() =>
                        onStationClick(station.latitude, station.longitude)
                      }
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
                    </button>
                  ) : (
                    <div
                      key={station.stationId}
                      className="flex items-center justify-between rounded-md p-2"
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
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
