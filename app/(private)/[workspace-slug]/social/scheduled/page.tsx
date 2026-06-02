import { PageShell } from "@/components/page-shell";
import { ScheduleStudio } from "@/components/social/schedule-studio";

export default async function ScheduledPostsPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;

  return (
    <PageShell>
      <ScheduleStudio slug={slug} />
    </PageShell>
  );
}
