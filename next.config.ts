import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sanity CDN images are served from a fixed host, so allow it explicitly.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" }],
  },
};

export default nextConfig;