import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { CustomFieldsSection } from "@/components/settings/custom-fields-section";
import { PipelinesSection } from "@/components/settings/pipelines-section";
import { ProfilesSection } from "@/components/settings/profiles-section";
import { SocialConnectionsSection } from "@/components/settings/social-connections-section";
import { WorkspaceMembersSection } from "@/components/settings/workspace-members-section";
import { SOCIAL_PLATFORM_META } from "@/components/social-platforms";
import { getAuthSession } from "@/src/lib/auth-session";
import { isTokenCryptoConfigured } from "@/src/lib/social/crypto";
import { getProvider } from "@/src/lib/social/providers";
import { MembershipRepository } from "@/src/repositories/membership.repository";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;

  const session = await getAuthSession();
  if (!session.ok) redirect("/sign-in");

  const membership = await MembershipRepository.findByUserAndSlug(
    session.value.user.id,
    slug,
  );
  if (!membership.ok || !membership.value) notFound();

  // Uma plataforma só é conectável quando o provedor tem credenciais E a
  // cifragem de tokens está configurada (a UI desabilita "Conectar" caso falte).
  const cryptoReady = isTokenCryptoConfigured();
  const configuredSlugs = SOCIAL_PLATFORM_META.filter(
    (meta) => cryptoReady && getProvider(meta.platform).isConfigured(),
  ).map((meta) => meta.slug);

  return (
    <PageShell>
      <Suspense>
        <WorkspaceMembersSection
          slug={slug}
          currentUserRole={membership.value.role}
        />
      </Suspense>
      <Suspense>
        <PipelinesSection
          slug={slug}
          canManage={
            membership.value.role === "OWNER" ||
            membership.value.role === "ADMIN"
          }
        />
      </Suspense>
      <Suspense>
        <CustomFieldsSection
          slug={slug}
          canManage={
            membership.value.role === "OWNER" ||
            membership.value.role === "ADMIN"
          }
        />
      </Suspense>
      <Suspense>
        <ProfilesSection
          slug={slug}
          canManage={
            membership.value.role === "OWNER" ||
            membership.value.role === "ADMIN"
          }
        />
      </Suspense>
      <Suspense>
        <SocialConnectionsSection
          slug={slug}
          configuredSlugs={configuredSlugs}
        />
      </Suspense>
    </PageShell>
  );
}
