import { notFound } from "next/navigation";
import { PagePlaceholder } from "@/components/page-placeholder";
import { PageShell } from "@/components/page-shell";
import { FacebookStudio } from "@/components/social/facebook-studio";
import { GoogleAnalyticsStudio } from "@/components/social/google-analytics-studio";
import { InstagramStudio } from "@/components/social/instagram-studio";
import { TiktokStudio } from "@/components/social/tiktok-studio";
import { YoutubeStudio } from "@/components/social/youtube-studio";
import { SOCIAL_PLATFORM_META } from "@/components/social-platforms";

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
      ) : meta.platform === "FACEBOOK" ? (
        <FacebookStudio slug={slug} />
      ) : meta.platform === "INSTAGRAM" ? (
        <InstagramStudio slug={slug} />
      ) : meta.platform === "TIKTOK" ? (
        <TiktokStudio slug={slug} />
      ) : meta.platform === "GOOGLE_ANALYTICS" ? (
        <GoogleAnalyticsStudio slug={slug} />
      ) : (
        <PagePlaceholder
          title={meta.label}
          description={`A integração com ${meta.label} será montada aqui. Conecte a conta em Settings.`}
        />
      )}
    </PageShell>
  );
}
