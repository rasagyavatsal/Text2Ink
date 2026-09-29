import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the editor available as static files in production.
  ...(process.env.NODE_ENV === "development" ? {} : { output: "export" }),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
