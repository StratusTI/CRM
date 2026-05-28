"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { IconSquare } from "@/components/icon-square";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { OTHER_NAV, WORKSPACE_NAV } from "@/components/workspace-nav-items";

/** Indicador lime à esquerda + texto realçado quando o item está ativo. */
const ACTIVE_ITEM =
  "relative data-active:text-foreground data-active:before:absolute data-active:before:left-0 data-active:before:top-1/2 data-active:before:h-4 data-active:before:w-[2px] data-active:before:-translate-y-1/2 data-active:before:rounded-full data-active:before:bg-primary data-active:before:shadow-[0_0_8px_var(--primary)]";

export function NavWorkspace({ slug }: { slug: string }) {
  const pathname = usePathname();

  const hrefFor = React.useCallback(
    (segment: string) => `/${slug}/${segment}`,
    [slug],
  );
  const isActive = React.useCallback(
    (segment: string) => pathname === hrefFor(segment),
    [pathname, hrefFor],
  );
  const isWithin = React.useCallback(
    (segment: string) =>
      pathname === hrefFor(segment) ||
      pathname.startsWith(`${hrefFor(segment)}/`),
    [pathname, hrefFor],
  );

  // Estado para controlar quais seções estão abertas.
  // Inicializa a partir do pathname atual.
  const [openItems, setOpenItems] = React.useState<Record<string, boolean>>({});

  // Sincroniza abertura ao navegar para um novo segmento.
  React.useEffect(() => {
    setOpenItems((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const item of WORKSPACE_NAV) {
        if (item.children && isWithin(item.segment)) {
          if (!next[item.title]) {
            next[item.title] = true;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [isWithin]);

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel className="text-[0.6875rem] uppercase tracking-[0.12em] text-sidebar-foreground/50">
          Workspace
        </SidebarGroupLabel>
        <SidebarMenu>
          {WORKSPACE_NAV.map((item) =>
            item.children ? (
              <Collapsible
                key={item.title}
                open={openItems[item.title] || false}
                onOpenChange={(open) =>
                  setOpenItems((prev) => ({ ...prev, [item.title]: open }))
                }
                render={<SidebarMenuItem />}
              >
                <SidebarMenuButton tooltip={item.title}>
                  <IconSquare icon={item.icon} color={item.color} />
                  <span>{item.title}</span>
                </SidebarMenuButton>
                <CollapsibleTrigger
                  render={
                    <SidebarMenuAction className="aria-expanded:rotate-90" />
                  }
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                  <span className="sr-only">Alternar {item.title}</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.children.map((child) => (
                      <SidebarMenuSubItem key={child.title}>
                        <SidebarMenuSubButton
                          isActive={isActive(child.segment)}
                          className="data-active:text-foreground"
                          render={
                            <Link href={hrefFor(child.segment)}>
                              <IconSquare
                                icon={child.icon}
                                color={child.color}
                              />
                              <span>{child.title}</span>
                            </Link>
                          }
                        />
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive(item.segment)}
                  className={ACTIVE_ITEM}
                  render={
                    <Link href={hrefFor(item.segment)}>
                      <IconSquare icon={item.icon} color={item.color} />
                      <span>{item.title}</span>
                    </Link>
                  }
                />
              </SidebarMenuItem>
            ),
          )}
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel className="text-[0.6875rem] uppercase tracking-[0.12em] text-sidebar-foreground/50">
          Outros
        </SidebarGroupLabel>
        <SidebarMenu>
          {OTHER_NAV.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={isActive(item.segment)}
                className={ACTIVE_ITEM}
                render={
                  <Link href={hrefFor(item.segment)}>
                    <IconSquare icon={item.icon} color={item.color} />
                    <span>{item.title}</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
