import { redirect } from "next/navigation";

// A "home" da workspace é a tabela de companies.
export default async function WorkspaceIndexPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  redirect(`/${slug}/companies`);
}
