import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  cacheComponents: true,
  experimental: {
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
