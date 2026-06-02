import type { Metadata } from "next";
import { ApiReference } from "@/components/api-reference";

export const metadata: Metadata = {
  title: "API pública",
  description:
    "Documentação da API pública do Arco CRM (integração por chave de API e autenticação).",
};

/** Docs Scalar da spec pública — acesso livre (sem login). */
export default function PublicApiDocsPage() {
  return <ApiReference url="/openapi.public.json" />;
}
