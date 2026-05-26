import type { NextConfig } from "next";

// Em prod a app fica servida sob `/crm` (`painel.stratustelecom.com.br/crm/...`).
// `basePath` é resolvido em build time — a env precisa estar setada no
// `next build` (ver Dockerfile + workflow CD).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  basePath,
  serverExternalPackages: ["@prisma/client"],
  experimental: {
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
