import { NotesTable } from "@/components/tables/notes-table";

export default async function NotesPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <NotesTable slug={slug} />;
}
