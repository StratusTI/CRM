import { EmailTemplatesList } from "@/components/email/email-templates-list";

export default async function EmailTemplatesPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <EmailTemplatesList slug={slug} />;
}
