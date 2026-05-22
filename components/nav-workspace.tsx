"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { usePathname } from "next/navigation";
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

  const hrefFor = (segment: string) => `/${slug}/${segment}`;
  const isActive = (segment: string) => pathname === hrefFor(segment);
  const isWithin = (segment: string) =>
    pathname === hrefFor(segment) ||
    pathname.startsWith(`${hrefFor(segment)}/`);

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
                defaultOpen={isWithin(item.segment)}
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
                            <a href={hrefFor(child.segment)}>
                              <IconSquare
                                icon={child.icon}
                                color={child.color}
                              />
                              <span>{child.title}</span>
                            </a>
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
                    <a href={hrefFor(item.segment)}>
                      <IconSquare icon={item.icon} color={item.color} />
                      <span>{item.title}</span>
                    </a>
                  }
                />
              </SidebarMenuItem>
            ),
          )}
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel className="text-[0.6875rem] uppercase tracking-[0.12em] text-sidebar-foreground/50">
          Other
        </SidebarGroupLabel>
        <SidebarMenu>
          {OTHER_NAV.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={isActive(item.segment)}
                className={ACTIVE_ITEM}
                render={
                  <a href={hrefFor(item.segment)}>
                    <IconSquare icon={item.icon} color={item.color} />
                    <span>{item.title}</span>
                  </a>
                }
              />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
