import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only use output: "export" when not in development mode to avoid breaking rewrites in dev.
  ...(process.env.NODE_ENV === "development" ? {} : { output: "export" }),
  images: {
    unoptimized: true,
  },
  // Set up development rewrites to proxy API requests to production or local emulator Cloud Function
  ...(process.env.NODE_ENV === "development" ? {
    async rewrites() {
      return [
        {
          source: "/api/inquiry",
          destination: process.env.API_URL || "http://127.0.0.1:5001/text2ink/us-central1/inquiry",
        },
      ];
    },
  } : {}),
};

export default nextConfig;
