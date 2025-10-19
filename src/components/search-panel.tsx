"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSearchState } from "@/hooks/use-search-state";
import { deleteLocationFromConvexAction } from "@/lib/actions/delete-location-action";
import { refreshLocationAction } from "@/lib/actions/refresh-location-action";
import { saveLocationToConvexAction } from "@/lib/actions/save-location-action";
import type { SearchResult } from "@/lib/services/search-state-service";
import { cleanAndTruncateDescription } from "@/lib/text-utils";
import { Loader2, MapPin, RefreshCw, Save, Search, X } from "lucide-react";
import { useState } from "react";

interface SearchPanelProps {
  onResultSelect: (result: SearchResult) => void;
}

export function SearchPanel({ onResultSelect }: SearchPanelProps) {
  const { search, results, isLoading, error, selectResult, selectedResult } =
    useSearchState();
  const [query, setQuery] = useState("");
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!query.trim()) return;
    await search(query);
  };

  const handleResultClick = (result: SearchResult) => {
    selectResult(result);
    onResultSelect(result);
  };

  const handleClear = () => {
    setQuery("");
    selectResult(null);
  };

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
    <div className="absolute top-20 left-4 z-20 w-96 bg-gray-900/95 dark:bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 dark:border-gray-200">
      {/* Search Input */}
      <div className="p-4 border-b border-gray-700 dark:border-gray-200">
        <div className="flex gap-2 items-stretch">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search locations..."
              className="w-full h-10 px-4 pr-10 rounded-md border border-gray-600 dark:border-gray-300 bg-gray-800 dark:bg-white text-white dark:text-gray-900 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isLoading}
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 dark:hover:text-gray-600"
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
          <div className="mt-2 text-sm text-red-400 dark:text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Results List */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading && (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Searching...</p>
          </div>
        )}

        {!isLoading && results.length === 0 && query && (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No results found</p>
          </div>
        )}

        {!isLoading && results.length === 0 && !query && (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Search for locations in Singapore</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="divide-y divide-gray-700 dark:divide-gray-200">
            {results.map((result) => {
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
                      ? "bg-purple-900/20 dark:bg-purple-50 border-l-4 border-purple-500"
                      : "hover:bg-gray-800/50 dark:hover:bg-gray-50"
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
                          <h3 className="font-medium text-white dark:text-gray-900 truncate">
                            {result.title}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-400 dark:text-gray-600 line-clamp-2">
                          {cleanAndTruncateDescription(result.description, 200)}
                        </p>
                        {result.url && (
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-purple-400 hover:text-purple-300 dark:text-purple-600 dark:hover:text-purple-500 mt-1 inline-flex items-center gap-1 hover:underline"
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
                              result.source === "exa" ? "default" : "secondary"
                            }
                          >
                            {result.source === "exa" ? "🔍 Exa" : "💾 Convex"}
                          </Badge>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {result.location.latitude.toFixed(4)},{" "}
                            {result.location.longitude.toFixed(4)}
                          </span>
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
                        className={`p-2 rounded-md hover:bg-gray-700/50 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          isSaved
                            ? "text-green-400 hover:text-green-300 dark:text-green-600 dark:hover:text-green-500"
                            : "text-gray-400 hover:text-gray-300 dark:text-gray-500 dark:hover:text-gray-400"
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
                        className="p-2 rounded-md text-red-400 hover:text-red-300 dark:text-red-600 dark:hover:text-red-500 hover:bg-gray-700/50 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="p-2 rounded-md text-gray-400 hover:text-white dark:text-gray-500 dark:hover:text-gray-900 hover:bg-gray-700/50 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        )}
      </div>

      {/* Results Summary */}
      {results.length > 0 && (
        <div className="p-3 border-t border-gray-700 dark:border-gray-200 bg-gray-800/50 dark:bg-gray-50 text-sm text-gray-400 dark:text-gray-600">
          Found {results.length} result{results.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
