import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    position: "bottom-left",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.mapbox.com",
        port: "",
        pathname: "/styles/v1/mapbox/**",
      },
      {
        protocol: "https",
        hostname: "*.convex.cloud",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
