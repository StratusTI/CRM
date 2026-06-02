"use client";

import type { ComponentProps } from "react";
import { NavUser } from "@/components/nav-user";
import { NavWorkspace } from "@/components/nav-workspace";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";

type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
};

type SidebarUser = {
  name: string;
  email: string;
  avatar: string;
};

export function AppSidebar({
  currentSlug,
  workspaces,
  user,
  ...props
}: {
  currentSlug: string;
  workspaces: WorkspaceSummary[];
  user: SidebarUser;
} & ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher currentSlug={currentSlug} workspaces={workspaces} />
      </SidebarHeader>
      <SidebarContent>
        <NavWorkspace slug={currentSlug} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} slug={currentSlug} />
      </SidebarFooter>
    </Sidebar>
  );
}
