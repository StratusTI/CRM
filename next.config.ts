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
    // O middleware faz o Next bufferizar o corpo da request em memória (proxy),
    // com limite default de 10MB. Uploads de vídeo (YouTube até 256MB, TikTok
    // até 64MB) eram truncados nesse buffer e `request.formData()` falhava com
    // "esperado multipart/form-data". Cobrimos o maior upload + folga do multipart.
    proxyClientMaxBodySize: "500mb",
  },
};

export default nextConfig;
