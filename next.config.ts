import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    position: "top-right",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.mapbox.com",
        port: "",
        pathname: "/styles/v1/mapbox/**",
      },
    ],
  },
};

export default nextConfig;
