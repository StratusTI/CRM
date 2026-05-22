import { CompaniesTable } from "@/components/tables/companies-table";

export default async function CompaniesPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <CompaniesTable slug={slug} />;
}
