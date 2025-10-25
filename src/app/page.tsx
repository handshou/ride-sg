"use client";

import { MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 py-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Choose Your City
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 px-2">
            Explore maps, find bicycle parking, and discover your city
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          {/* Singapore Card */}
          <Link href="/singapore" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl md:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 transition-all duration-300 hover:shadow-2xl hover:scale-105 cursor-pointer">
              <div className="flex items-center justify-center mb-3 sm:mb-4 md:mb-6">
                <div className="p-2 sm:p-3 md:p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <MapPin className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-2 sm:mb-3">
                Singapore
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-center text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 md:mb-6 line-clamp-3">
                Explore the Lion City with real-time rainfall data, bicycle
                parking locations, and interactive 3D maps
              </p>
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm md:text-base"
                size="sm"
              >
                Explore Singapore
              </Button>
            </div>
          </Link>

          {/* Jakarta Card */}
          <Link href="/jakarta" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl md:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 transition-all duration-300 hover:shadow-2xl hover:scale-105 cursor-pointer">
              <div className="flex items-center justify-center mb-3 sm:mb-4 md:mb-6">
                <div className="p-2 sm:p-3 md:p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <MapPin className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-2 sm:mb-3">
                Jakarta
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-center text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 md:mb-6 line-clamp-3">
                Discover Indonesia's capital with interactive maps, bicycle
                parking, and location search features
              </p>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm md:text-base"
                size="sm"
              >
                Explore Jakarta
              </Button>
            </div>
          </Link>
        </div>

        <div className="text-center mt-6 sm:mt-8 md:mt-12 px-4">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Can't decide? Use the "Locate Me" button in each city to
            automatically detect your location
          </p>
        </div>
      </div>
    </div>
  );
}
