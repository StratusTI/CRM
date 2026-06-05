import { LandingPageBuilder } from "@/components/landing-pages/landing-page-builder";
import { availableAiProviders } from "@/src/lib/ai/env";

export default async function LandingPageBuilderPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string; id: string }>;
}) {
  const { "workspace-slug": slug, id } = await params;
  return (
    <LandingPageBuilder
      slug={slug}
      pageId={id}
      providers={availableAiProviders()}
    />
  );
}
