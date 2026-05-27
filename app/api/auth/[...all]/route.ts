import { auth } from "../../../../src/lib/auth";

// Em prod a app é montada sob `/crm` (Next basePath). O Next strippa o
// basePath de `req.url` antes do route handler chegar aqui (router-server.js
// stripping). Mas o better-auth foi configurado com `basePath: "/crm/api/auth"`
// — necessário pra montar `redirect_uri` corretos no OAuth — e a função
// `normalizePathname` dele compara contra `request.url`. Sem o `/crm` de
// volta, o matching falha e retorna 404.
//
// Reconstruímos a URL injetando o basePath antes de delegar pro handler.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

async function handler(request: Request): Promise<Response> {
  if (!BASE_PATH) return auth.handler(request);

  const url = new URL(request.url);
  if (url.pathname.startsWith(`${BASE_PATH}/`)) return auth.handler(request);

  url.pathname = `${BASE_PATH}${url.pathname}`;
  const patched = new Request(url, request);
  return auth.handler(patched);
}

export { handler as GET, handler as POST };
