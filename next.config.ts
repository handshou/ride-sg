import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local verification builds (pre-push hook) write elsewhere so they do not
  // clobber the .next directory a running `next dev` is serving from.
  distDir: process.env.NEXT_DIST_DIR || ".next",
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
    ],
  },
};

export default nextConfig;
