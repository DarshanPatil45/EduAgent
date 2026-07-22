import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin requests to the backend in dev
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "X-Content-Type-Options", value: "nosniff" }],
      },
    ];
  },
};

export default nextConfig;
