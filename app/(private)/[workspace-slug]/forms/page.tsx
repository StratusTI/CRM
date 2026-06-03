import { FormsTable } from "@/components/tables/forms-table";

export default async function FormsPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <FormsTable slug={slug} />;
}
