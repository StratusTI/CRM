import { NEXT_PUBLIC_URL } from "./env/env";

// Helpers para prefixar `basePath` (Next: `/crm` em prod) em URLs que o Next
// NÃO trata sozinho:
//
// - `fetch` no browser (paths absolutos `/api/foo`).
// - `redirect()` / `NextResponse.redirect()` dentro de **route handlers**
//   (`route.ts`). Diferente de pages/layouts/server actions, o módulo de
//   route handler do Next 16 escreve `Location` direto, sem `addPathPrefix`.
//
// `NEXT_PUBLIC_BASE_PATH` é inlineado pelo Next no client bundle no build.

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}

/**
 * Cria uma URL absoluta usando o domínio público (`NEXT_PUBLIC_URL`).
 * Útil para `NextResponse.redirect()` em route handlers para evitar expor
 * hostnames internos (ex: localhost:3000).
 */
export function withPublicUrl(path: string): URL {
  return new URL(withBasePath(path), NEXT_PUBLIC_URL);
}

/** Alias semântico para chamadas de API client-side. */
export const apiUrl = withBasePath;
