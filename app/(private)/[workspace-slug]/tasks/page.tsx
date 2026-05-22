import { TasksTable } from "@/components/tables/tasks-table";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <TasksTable slug={slug} />;
}
