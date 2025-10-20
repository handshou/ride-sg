"use client";

import { Exa } from "@lobehub/icons";
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Loader2,
  MapPin,
  RefreshCw,
  Save,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import { useSearchState } from "@/hooks/use-search-state";
import { deleteLocationFromConvexAction } from "@/lib/actions/delete-location-action";
import { refreshLocationAction } from "@/lib/actions/refresh-location-action";
import { saveLocationToConvexAction } from "@/lib/actions/save-location-action";
import type { SearchResult } from "@/lib/services/search-state-service";
import { cleanAndTruncateDescription } from "@/lib/text-utils";

interface SearchPanelProps {
  onResultSelect: (result: SearchResult) => void;
}

export function SearchPanel({ onResultSelect }: SearchPanelProps) {
  const isMobile = useMobile();
  const { search, results, isLoading, error, selectResult, selectedResult } =
    useSearchState();
  const [query, setQuery] = useState("");
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [currentResultIndex, setCurrentResultIndex] = useState(0);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setCurrentResultIndex(0); // Reset to first result on new search
    await search(query);
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

  // Get results to display (1 for mobile, all for desktop)
  const displayResults =
    isMobile && results.length > 0 ? [results[currentResultIndex]] : results;

  const handleRefresh = async (result: SearchResult, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the result
    setRefreshingId(result.id);

    try {
      const { result: refreshedResult, error: refreshError } =
        await refreshLocationAction(result.title, result.id);

      if (refreshError) {
        console.error("Refresh failed:", refreshError);
      } else if (refreshedResult) {
        // Trigger a new search to refresh the results list
        await search(query);
        onResultSelect(refreshedResult);
      }
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleSaveToConvex = async (
    result: SearchResult,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation(); // Prevent selecting the result
    setSavingId(result.id);

    try {
      const { success, error: saveError } =
        await saveLocationToConvexAction(result);

      if (saveError) {
        console.error("Save failed:", saveError);
      } else if (success) {
        console.log(`✓ Saved to Convex: ${result.title}`);
        // Mark as saved (turns green)
        setSavedIds((prev) => new Set(prev).add(result.id));
        // Trigger a new search to refresh the results list (will now show from Convex)
        await search(query);
      }
    } catch (error) {
      console.error("Save error:", error);
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

    try {
      const { success, error: deleteError } =
        await deleteLocationFromConvexAction(result.id);

      if (deleteError) {
        console.error("Delete failed:", deleteError);
      } else if (success) {
        console.log(`✓ Deleted from Convex: ${result.title}`);
        // Trigger a new search to refresh the results list (will now search Exa)
        await search(query);
      }
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setDeletingId(null);
    }
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
                const isRefreshing = refreshingId === result.id;
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
                          className={`p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            isSaved
                              ? "text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300"
                              : "text-gray-500 hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-300"
                          }`}
                          title={
                            isSaved
                              ? "Saved to Convex ✓"
                              : "Save to Convex (overrides existing)"
                          }
                        >
                          <Save
                            className={`h-4 w-4 ${isSaving ? "animate-pulse" : ""}`}
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

                      {/* Refresh Button */}
                      <button
                        type="button"
                        onClick={(e) => handleRefresh(result, e)}
                        disabled={isRefreshing}
                        className="p-2 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Refresh from Exa"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Results Summary */}
      {results.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-600 dark:text-gray-400">
          Found {results.length} result{results.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
