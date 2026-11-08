import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production runs in Vercel Services mode, which does not expose the Next.js image
  // optimizer under `/_next/image`, so every optimized request 404s there. Sanity's CDN
  // already resizes and picks a format, so images load straight from it through the
  // custom loader instead of the optimizer, and `remotePatterns` no longer applies.
  images: {
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
  },
};

export default nextConfig;
