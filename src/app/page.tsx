"use client";

import { MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your City
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Explore maps, find bicycle parking, and discover your city
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Singapore Card */}
          <Link href="/singapore" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 transition-all duration-300 hover:shadow-2xl hover:scale-105 cursor-pointer">
              <div className="flex items-center justify-center mb-6">
                <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <MapPin className="w-12 h-12 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-3">
                Singapore
              </h2>
              <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
                Explore the Lion City with real-time rainfall data, bicycle
                parking locations, and interactive 3D maps
              </p>
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                size="lg"
              >
                Explore Singapore
              </Button>
            </div>
          </Link>

          {/* Jakarta Card */}
          <Link href="/jakarta" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 transition-all duration-300 hover:shadow-2xl hover:scale-105 cursor-pointer">
              <div className="flex items-center justify-center mb-6">
                <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <MapPin className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-3">
                Jakarta
              </h2>
              <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
                Discover Indonesia's capital with interactive maps, bicycle
                parking, and location search features
              </p>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                Explore Jakarta
              </Button>
            </div>
          </Link>
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Can't decide? Use the "Locate Me" button in each city to
            automatically detect your location
          </p>
        </div>
      </div>
    </div>
  );
}
