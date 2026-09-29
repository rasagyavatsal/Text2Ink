import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the editor available as static files in production.
  ...(process.env.NODE_ENV === "development" ? {} : { output: "export" }),
  images: {
    unoptimized: true,
  },
  // Serve the E2E download fixture with an attachment header during development.
  ...(process.env.NODE_ENV === "development" ? {
    async headers() {
      return [
        {
          // Serve the E2E test download fixture with Content-Disposition: attachment
          // so Playwright's download helper test can trigger a real download event.
          source: "/e2e-test-download.txt",
          headers: [
            {
              key: "Content-Disposition",
              value: 'attachment; filename="e2e-test-download.txt"',
            },
          ],
        },
      ];
    },
  } : {}),
};

export default nextConfig;
