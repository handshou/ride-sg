"use client";

import { Loader2, MapPin, Search, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SearchResult } from "@/lib/search-state-service";
import { useSearchState } from "@/lib/use-search-state";

interface SearchPanelProps {
  onResultSelect: (result: SearchResult) => void;
}

export function SearchPanel({ onResultSelect }: SearchPanelProps) {
  const { search, results, isLoading, error, selectResult, selectedResult } =
    useSearchState();
  const [query, setQuery] = useState("");

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

  return (
    <div className="absolute top-20 left-4 z-20 w-96 bg-gray-900/95 dark:bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 dark:border-gray-200">
      {/* Search Input */}
      <div className="p-4 border-b border-gray-700 dark:border-gray-200">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search locations..."
              className="w-full px-4 py-2 pr-10 rounded-md border border-gray-600 dark:border-gray-300 bg-gray-800 dark:bg-white text-white dark:text-gray-900 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
            size="default"
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

              return (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => handleResultClick(result)}
                  className={`w-full p-4 text-left transition-colors ${
                    isSelected
                      ? "bg-purple-900/20 dark:bg-purple-50 border-l-4 border-purple-500"
                      : "hover:bg-gray-800/50 dark:hover:bg-gray-50"
                  }`}
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
                        {result.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant={
                            result.source === "exa" ? "default" : "secondary"
                          }
                        >
                          {result.source === "exa" ? "🔍 Exa" : "💾 Saved"}
                        </Badge>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {result.location.latitude.toFixed(4)},{" "}
                          {result.location.longitude.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
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
