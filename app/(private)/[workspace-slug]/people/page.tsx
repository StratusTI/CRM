import { PeopleTable } from "@/components/tables/people-table";

export default async function PeoplePage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <PeopleTable slug={slug} />;
}
