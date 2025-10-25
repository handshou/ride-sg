"use client";

import { Exa } from "@lobehub/icons";
import { Effect } from "effect";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Database,
  Heart,
  Loader2,
  Map as MapIcon,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import { useSearchState } from "@/hooks/use-search-state";
import { deleteLocationFromConvexAction } from "@/lib/actions/delete-location-action";
import { saveLocationToConvexAction } from "@/lib/actions/save-location-action";
import { logger } from "@/lib/client-logger";
import { getCurrentPositionEffect } from "@/lib/services/geolocation-service";
import type { SearchResult } from "@/lib/services/search-state-service";
import { cleanAndTruncateDescription } from "@/lib/text-utils";

interface SearchPanelProps {
  onResultSelect: (result: SearchResult) => void;
  onSearchStateReady?: (addResult: (result: SearchResult) => void) => void;
  onGetMapCenter?: () => { lat: number; lng: number } | undefined;
}

/**
 * Generate Google Maps URL with smart parameter selection
 * Priority: lat/long > postal code > title
 */
function getGoogleMapsUrl(result: SearchResult): string {
  // Highest confidence: Use coordinates
  if (result.location?.latitude && result.location?.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${result.location.latitude},${result.location.longitude}`;
  }

  // Medium confidence: Use postal code if available
  const postalMatch = result.address?.match(/\b\d{6}\b/);
  if (postalMatch) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(postalMatch[0])}`;
  }

  // Fallback: Use title
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.title)}`;
}

export function SearchPanel({
  onResultSelect,
  onSearchStateReady,
  onGetMapCenter,
}: SearchPanelProps) {
  const isMobile = useMobile();
  const pathname = usePathname();
  const {
    search,
    results,
    isLoading,
    error,
    selectResult,
    selectedResult,
    addResult,
  } = useSearchState();
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [isResultsMinimized, setIsResultsMinimized] = useState(true);
  const [optimisticallyDeletedIds, setOptimisticallyDeletedIds] = useState<
    Set<string>
  >(new Set());

  // Memoized callback to add result and update UI
  const handleAddResult = useCallback(
    (result: SearchResult) => {
      addResult(result);
      setIsResultsMinimized(false); // Expand results when location is added
      setQuery(result.title); // Update query input
    },
    [addResult],
  );

  // Expose addResult method to parent component (only once)
  useEffect(() => {
    if (onSearchStateReady) {
      onSearchStateReady(handleAddResult);
    }
  }, [onSearchStateReady, handleAddResult]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setCurrentResultIndex(0); // Reset to first result on new search

    // Detect location keywords
    const hasNearMe = /near me/i.test(query);
    const hasNearby = /nearby|around here/i.test(query);

    let userLocation: { latitude: number; longitude: number } | undefined;
    let referenceLocation: { latitude: number; longitude: number } | undefined;
    let locationName: string | undefined;

    // Get user location for "near me"
    if (hasNearMe) {
      try {
        const result = await Effect.runPromise(getCurrentPositionEffect());
        userLocation = result;
        referenceLocation = result; // Use for distance calculation
        logger.info("User location obtained", result);

        // Reverse geocode to get location name for Exa
        try {
          const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
          if (mapboxToken) {
            const reverseGeoResponse = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${result.longitude},${result.latitude}.json?access_token=${mapboxToken}&limit=1`,
            );
            const reverseGeoData = await reverseGeoResponse.json();
            if (reverseGeoData.features && reverseGeoData.features.length > 0) {
              locationName = reverseGeoData.features[0].place_name;
              logger.info("Reverse geocoded location", locationName);
            }
          }
        } catch (error) {
          logger.warn("Failed to reverse geocode location", error);
        }
      } catch (_error) {
        // Fallback: use map center if available
        logger.warn("Failed to get user location, falling back to map center");
        if (onGetMapCenter) {
          const mapCenter = onGetMapCenter();
          if (mapCenter) {
            referenceLocation = {
              latitude: mapCenter.lat,
              longitude: mapCenter.lng,
            };
          }
        }
      }
    }

    // Get map center for "nearby" or "around here"
    if (hasNearby && onGetMapCenter) {
      const mapCenter = onGetMapCenter();
      if (mapCenter) {
        referenceLocation = {
          latitude: mapCenter.lat,
          longitude: mapCenter.lng,
        };
        logger.info("Using map center for location-based search", mapCenter);
      }
    }

    // If locationName is still not set, detect from URL path (Singapore or Jakarta)
    if (!locationName) {
      if (pathname.includes("/jakarta")) {
        locationName = "Jakarta, Indonesia";
        logger.info("Using Jakarta as location context from URL");
      } else if (pathname.includes("/singapore")) {
        locationName = "Singapore";
        logger.info("Using Singapore as location context from URL");
      } else {
        // Default fallback
        locationName = "Singapore";
        logger.info("Using Singapore as default location context");
      }
    }

    // Perform search with location context
    await search(query, userLocation, referenceLocation, locationName);
  };

  const handleResultClick = (result: SearchResult) => {
    selectResult(result);
    onResultSelect(result);
  };

  const handleClear = () => {
    setQuery("");
    selectResult(null);
    setCurrentResultIndex(0);
  };

  const handlePrevResult = () => {
    setCurrentResultIndex((prev) => Math.max(0, prev - 1));
    if (results.length > 0 && currentResultIndex > 0) {
      const prevResult = results[currentResultIndex - 1];
      handleResultClick(prevResult);
    }
  };

  const handleNextResult = () => {
    setCurrentResultIndex((prev) => Math.min(results.length - 1, prev + 1));
    if (results.length > 0 && currentResultIndex < results.length - 1) {
      const nextResult = results[currentResultIndex + 1];
      handleResultClick(nextResult);
    }
  };

  // Filter out optimistically deleted results
  const filteredResults = results.filter(
    (r) => !optimisticallyDeletedIds.has(r.id),
  );

  // Get results to display (1 for mobile, all for desktop)
  const displayResults =
    isMobile && filteredResults.length > 0
      ? [filteredResults[currentResultIndex]]
      : filteredResults;

  const handleSaveToConvex = async (
    result: SearchResult,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation(); // Prevent selecting the result
    setSavingId(result.id);

    try {
      const {
        success,
        error: saveError,
        id: newConvexId,
      } = await saveLocationToConvexAction(result);

      if (saveError) {
        logger.error("Save failed:", saveError);
        // Show user-friendly toast error
        toast.error(`Failed to save: ${saveError}`);
      } else if (success) {
        logger.success(`Saved to Convex: ${result.title} (ID: ${newConvexId})`);
        // Mark as saved (turns green)
        setSavedIds((prev) => new Set(prev).add(result.id));
        // Show success toast
        toast.success(`Saved ${result.title}`);
        // Refresh search results to get the database version with proper Convex ID
        // This ensures the delete button will work correctly
        await search(query);
      }
    } catch (error) {
      logger.error("Save error:", error);
      toast.error("Failed to save location");
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteFromConvex = async (
    result: SearchResult,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation(); // Prevent selecting the result
    setDeletingId(result.id);

    // Optimistically hide from UI immediately
    setOptimisticallyDeletedIds((prev) => new Set(prev).add(result.id));

    // Use toast.promise for automatic loading/success/error states
    const deletePromise = (async () => {
      try {
        const { success, error: deleteError } =
          await deleteLocationFromConvexAction(result.id);

        if (deleteError) {
          logger.error("Delete failed:", deleteError);
          // Revert optimistic deletion on error
          setOptimisticallyDeletedIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(result.id);
            return newSet;
          });
          throw new Error(deleteError);
        } else if (success) {
          logger.success(`Deleted from Convex: ${result.title}`);
          // Refresh search to sync with Convex (will remove from actual results)
          await search(query);
          // Clear optimistic state after real data loads
          setOptimisticallyDeletedIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(result.id);
            return newSet;
          });
          return result.title;
        }
      } catch (error) {
        logger.error("Delete error:", error);
        // Revert optimistic deletion on error
        setOptimisticallyDeletedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(result.id);
          return newSet;
        });
        throw error;
      } finally {
        setDeletingId(null);
      }
    })();

    toast.promise(deletePromise, {
      loading: `Deleting ${result.title}...`,
      success: (title) => `Deleted ${title}`,
      error: (err) => `Failed to delete: ${err.message || "Unknown error"}`,
    });
  };

  return (
    <div
      className={`absolute z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 ${
        isMobile
          ? "bottom-4 left-4 right-4 w-auto max-h-[60vh]"
          : "top-20 left-4 w-96"
      }`}
    >
      {/* Search Input */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2 items-stretch">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search locations..."
              className="w-full h-10 px-4 pr-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isLoading}
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className="h-10 w-10 p-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {error && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Results List */}
      {!isResultsMinimized && (
        <div className="max-h-96 overflow-y-auto">
          {isLoading && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Searching...</p>
            </div>
          )}

          {!isLoading && results.length === 0 && query && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No results found</p>
            </div>
          )}

          {!isLoading && results.length === 0 && !query && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Search for locations in Singapore</p>
            </div>
          )}

          {results.length > 0 && (
            <>
              {/* Mobile Navigation */}
              {isMobile && results.length > 1 && (
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevResult}
                    disabled={currentResultIndex === 0}
                    className="h-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {currentResultIndex + 1} / {results.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextResult}
                    disabled={currentResultIndex === results.length - 1}
                    className="h-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {displayResults.map((result) => {
                  const isSelected = selectedResult?.id === result.id;
                  const isSaving = savingId === result.id;
                  const isDeleting = deletingId === result.id;
                  const isSaved = savedIds.has(result.id);
                  const isFromExa = result.source === "exa";
                  const isFromConvex = result.source === "database";

                  return (
                    <div
                      key={result.id}
                      className={`flex items-center transition-colors ${
                        isSelected
                          ? "bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleResultClick(result)}
                        className="flex-1 p-4 text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <MapPin className="h-4 w-4 text-purple-500 flex-shrink-0" />
                              <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                {result.title}
                              </h3>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {cleanAndTruncateDescription(
                                result.description,
                                200,
                              )}
                            </p>
                            {result.url && (
                              <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300 mt-1 inline-flex items-center gap-1 hover:underline"
                              >
                                <span>🔗</span>
                                <span className="truncate max-w-[200px]">
                                  {new URL(result.url).hostname}
                                </span>
                              </a>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge
                                variant={
                                  result.source === "exa"
                                    ? "default"
                                    : "secondary"
                                }
                                className="flex items-center gap-1"
                              >
                                {result.source === "exa" ? (
                                  <Exa.Combine size={12} />
                                ) : (
                                  <>
                                    <Database className="h-3 w-3" />
                                    <span>Convex</span>
                                  </>
                                )}
                              </Badge>
                              {result.distance !== undefined && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  📍{" "}
                                  {result.distance < 1000
                                    ? `${Math.round(result.distance)}m away`
                                    : `${(result.distance / 1000).toFixed(1)}km away`}
                                </span>
                              )}
                              {result.address &&
                                (() => {
                                  // Extract postal code (6 digits) from address
                                  const postalMatch =
                                    result.address.match(/\b\d{6}\b/);
                                  return postalMatch ? (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      📮 {postalMatch[0]}
                                    </span>
                                  ) : null;
                                })()}
                            </div>
                            {/* Open in Google Maps Link */}
                            <a
                              href={getGoogleMapsUrl(result)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs mt-1 inline-flex items-center gap-1"
                            >
                              <Badge
                                variant="outline"
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 border-blue-300 dark:border-blue-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer"
                              >
                                <MapIcon className="h-3 w-3" />
                                <span>Google Maps</span>
                              </Badge>
                            </a>
                          </div>
                        </div>
                      </button>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 pr-3">
                        {/* Save to Convex Button - Only show for Exa results */}
                        {isFromExa && (
                          <button
                            type="button"
                            onClick={(e) => handleSaveToConvex(result, e)}
                            disabled={isSaving}
                            className={`p-2 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group ${
                              isSaved
                                ? "text-red-500 dark:text-red-400"
                                : "text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                            }`}
                            title={
                              isSaved
                                ? "Saved to randomized list ❤"
                                : "Add to randomized list"
                            }
                          >
                            <Heart
                              className={`h-4 w-4 transition-all ${
                                isSaving
                                  ? "animate-pulse"
                                  : isSaved
                                    ? "fill-current scale-110"
                                    : "scale-100"
                              }`}
                            />
                          </button>
                        )}

                        {/* Delete from Convex Button - Only show for Convex results */}
                        {isFromConvex && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteFromConvex(result, e)}
                            disabled={isDeleting}
                            className="p-2 rounded-md text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete from Convex"
                          >
                            <X
                              className={`h-4 w-4 ${isDeleting ? "animate-pulse" : ""}`}
                            />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Results Summary */}
      {results.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
          <button
            type="button"
            onClick={() => setIsResultsMinimized(!isResultsMinimized)}
            className="w-full flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <span>
              Found {results.length} result{results.length !== 1 ? "s" : ""}
            </span>
            {isResultsMinimized ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
