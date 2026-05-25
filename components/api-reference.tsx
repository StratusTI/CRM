"use client";

import dynamic from "next/dynamic";

// O Scalar embute um runtime Vue e monta sua própria UI no cliente; carregamos
// sem SSR (`ssr: false`, só permitido em Client Component) para evitar erros de
// prerender sob `cacheComponents`.
const ApiReferenceReact = dynamic(
  () => import("@scalar/api-reference-react").then((m) => m.ApiReferenceReact),
  { ssr: false },
);

/** Renderiza a documentação Scalar a partir de um openapi.json servido em /public. */
export function ApiReference({ url }: { url: string }) {
  return (
    <div className="h-dvh">
      <ApiReferenceReact configuration={{ url }} />
    </div>
  );
}
