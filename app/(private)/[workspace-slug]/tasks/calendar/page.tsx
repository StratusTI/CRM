import { TasksCalendar } from "@/components/calendar/tasks-calendar";
import { PageShell } from "@/components/page-shell";

export default async function TasksCalendarPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return (
    <PageShell>
      <TasksCalendar slug={slug} />
    </PageShell>
  );
}
