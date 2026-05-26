// `fetch` no browser não conhece `basePath` — paths absolutos (`/api/foo`)
// quebram em produção, onde a app é servida sob `/crm`. Esse helper prefixa
// o basePath em chamadas de client components.
//
// `NEXT_PUBLIC_BASE_PATH` é inlineado pelo Next no client bundle no build.

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function apiUrl(path: string): string {
  return `${BASE_PATH}${path}`;
}
