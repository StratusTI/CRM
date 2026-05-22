"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { IconSquare } from "@/components/icon-square";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { findNavLeaf } from "@/components/workspace-nav-items";

/** Deriva o caminho do recurso a partir do pathname (`/<slug>/<resource...>`). */
function resourcePathFromPathname(pathname: string): string {
  return pathname.split("/").filter(Boolean).slice(1).join("/");
}

/**
 * Barra de topo da página: substitui o nome do workspace pelo ícone + nome da
 * página atual (derivado da rota). `action` fica no lado oposto (ex.: "New X").
 */
export function PageHeader({ action }: { action?: ReactNode }) {
  const pathname = usePathname();
  const leaf = findNavLeaf(resourcePathFromPathname(pathname));

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/70 px-3 sm:px-4">
      <SidebarTrigger className="-ml-1 text-muted-foreground" />
      <div className="h-5 w-px bg-border" aria-hidden />
      {leaf ? (
        <div className="flex min-w-0 items-center gap-2.5">
          <IconSquare icon={leaf.icon} color={leaf.color} />
          <h1 className="truncate font-semibold text-[0.95rem] tracking-tight">
            {leaf.title}
          </h1>
        </div>
      ) : null}
      {action ? (
        <div className="ml-auto flex items-center gap-2">{action}</div>
      ) : null}
    </header>
  );
}
