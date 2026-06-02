import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import { AiAssistantWidget } from "@/components/ai/ai-assistant-widget";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { isAiConfigured } from "@/src/lib/ai/env";
import { getAuthSession } from "@/src/lib/auth-session";
import { MembershipRepository } from "@/src/repositories/membership.repository";
import { WorkspaceService } from "@/src/services/workspace.service";

type WorkspaceLayoutProps = {
  children: ReactNode;
  params: Promise<{ "workspace-slug": string }>;
};

export async function generateMetadata({
  params,
}: WorkspaceLayoutProps): Promise<Metadata> {
  const { "workspace-slug": slug } = await params;

  return {
    title: `${slug} | Arco`,
    description:
      "Arco reúne empresas, pessoas, negócios e notas em um workspace de CRM rápido e focado.",
  };
}

// O acesso dinâmico (sessão + DB) fica dentro do `<Suspense>` para satisfazer
// o `cacheComponents` — ver comentário no layout pai `(private)/layout.tsx`.
export default function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  return (
    <Suspense fallback={null}>
      <WorkspaceGate params={params}>{children}</WorkspaceGate>
    </Suspense>
  );
}

async function WorkspaceGate({ children, params }: WorkspaceLayoutProps) {
  const [{ "workspace-slug": slug }, session] = await Promise.all([
    params,
    getAuthSession(),
  ]);

  if (!session.ok) redirect("/sign-in");

  const membership = await MembershipRepository.findByUserAndSlug(
    session.value.user.id,
    slug,
  );

  if (!membership.ok || !membership.value) {
    const memberships = await MembershipRepository.listByUser(
      session.value.user.id,
    );
    if (memberships.ok && memberships.value.length === 0) {
      redirect("/create-workspace");
    }
    notFound();
  }

  const workspacesResult = await WorkspaceService.list(session.value.user.id);
  const workspaces = workspacesResult.ok
    ? workspacesResult.value.map((w) => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
      }))
    : [];

  const { name, email, image } = session.value.user;

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar
        currentSlug={slug}
        workspaces={workspaces}
        user={{ name, email, avatar: image ?? "" }}
      />
      <SidebarInset className="min-h-0 overflow-hidden md:peer-data-[variant=inset]:ring-1 md:peer-data-[variant=inset]:ring-white/[0.06]">
        {children}
      </SidebarInset>
      {isAiConfigured() && (
        <AiAssistantWidget slug={slug} userName={name ?? ""} />
      )}
    </SidebarProvider>
  );
}
