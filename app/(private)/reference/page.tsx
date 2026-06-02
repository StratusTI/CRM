import type { Metadata } from "next";
import { ApiReference } from "@/components/api-reference";

export const metadata: Metadata = {
  title: "Referência da API",
  description:
    "Documentação da API privada do Arco CRM (endpoints com sessão).",
};

/** Docs Scalar da spec privada — sob a área autenticada ((private)/layout). */
export default function ReferencePage() {
  return <ApiReference url="/openapi.private.json" />;
}
