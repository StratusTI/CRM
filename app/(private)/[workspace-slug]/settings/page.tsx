import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { SocialConnectionsSection } from "@/components/settings/social-connections-section";
import { SOCIAL_PLATFORM_META } from "@/components/social-platforms";
import { isTokenCryptoConfigured } from "@/src/lib/social/crypto";
import { getProvider } from "@/src/lib/social/providers";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;

  // Uma plataforma só é conectável quando o provedor tem credenciais E a
  // cifragem de tokens está configurada (a UI desabilita "Conectar" caso falte).
  const cryptoReady = isTokenCryptoConfigured();
  const configuredSlugs = SOCIAL_PLATFORM_META.filter(
    (meta) => cryptoReady && getProvider(meta.platform).isConfigured(),
  ).map((meta) => meta.slug);

  return (
    <PageShell>
      <Suspense>
        <SocialConnectionsSection
          slug={slug}
          configuredSlugs={configuredSlugs}
        />
      </Suspense>
    </PageShell>
  );
}
