"use client";

import {
  CheckmarkCircle02Icon,
  PlusSignIcon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
};

/** Primeira letra do nome da workspace, em maiúscula. */
function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

/** Quadrado arredondado com a inicial da workspace. */
function WorkspaceBadge({ name }: { name: string }) {
  return (
    <div className="relative flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/75 font-semibold text-sidebar-primary-foreground text-sm shadow-sm ring-1 ring-inset ring-white/20 before:absolute before:inset-0 before:rounded-[inherit] before:bg-gradient-to-b before:from-white/25 before:to-transparent">
      <span className="relative">{initial(name)}</span>
    </div>
  );
}

export function WorkspaceSwitcher({
  currentSlug,
  workspaces,
}: {
  currentSlug: string;
  workspaces: WorkspaceSummary[];
}) {
  const router = useRouter();
  const { isMobile } = useSidebar();

  const active =
    workspaces.find((w) => w.slug === currentSlug) ?? workspaces[0];

  if (!active) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            nativeButton={true}
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <WorkspaceBadge name={active.name} />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{active.name}</span>
              <span className="truncate text-muted-foreground text-xs">
                Workspace
              </span>
            </div>
            <HugeiconsIcon
              icon={UnfoldMoreIcon}
              strokeWidth={2}
              className="ml-auto size-4"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-60 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Workspaces
              </DropdownMenuLabel>
              {workspaces.map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  className="gap-2 p-2"
                  onClick={() => router.push(`/${workspace.slug}/companies`)}
                >
                  <div className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/75 font-semibold text-sidebar-primary-foreground text-xs ring-1 ring-inset ring-white/15">
                    {initial(workspace.name)}
                  </div>
                  <span className="truncate">{workspace.name}</span>
                  {workspace.slug === active.slug ? (
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      strokeWidth={2}
                      className="ml-auto size-4"
                    />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2"
              onClick={() => router.push("/create-workspace")}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <HugeiconsIcon
                  icon={PlusSignIcon}
                  strokeWidth={2}
                  className="size-4"
                />
              </div>
              <span className="font-medium text-muted-foreground">
                Nova workspace
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}


