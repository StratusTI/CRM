import { notFound } from "next/navigation";
import { PagePlaceholder } from "@/components/page-placeholder";
import { PageShell } from "@/components/page-shell";
import { SOCIAL_PLATFORM_META } from "@/components/social-platforms";
import { YoutubeStudio } from "@/components/social/youtube-studio";

export default async function SocialPlatformPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string; platform: string }>;
}) {
  const { "workspace-slug": slug, platform } = await params;
  const meta = SOCIAL_PLATFORM_META.find((p) => p.slug === platform);
  if (!meta) notFound();

  return (
    <PageShell>
      {meta.platform === "YOUTUBE" ? (
        <YoutubeStudio slug={slug} />
      ) : (
        <PagePlaceholder
          title={meta.label}
          description={`A integração com ${meta.label} será montada aqui. Conecte a conta em Settings.`}
        />
      )}
    </PageShell>
  );
}
