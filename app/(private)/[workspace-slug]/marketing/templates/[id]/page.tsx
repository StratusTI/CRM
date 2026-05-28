import { redirect } from "next/navigation";

export default async function EditEmailTemplatePage({
  params,
}: {
  params: Promise<{ "workspace-slug": string; id: string }>;
}) {
  const { "workspace-slug": slug } = await params;
  redirect(`/${slug}/marketing/templates`);
}
