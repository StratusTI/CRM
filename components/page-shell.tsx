import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";

/** Casca de página: barra de topo (ícone + nome + ação) e área rolável. */
export function PageShell({
  action,
  children,
}: {
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <PageHeader action={action} />
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
