import { EmailTemplateEditor } from "@/components/email/email-template-editor";
import { PageShell } from "@/components/page-shell";

export default async function NewEmailTemplatePage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return (
    <PageShell>
      <EmailTemplateEditor slug={slug} />
    </PageShell>
  );
}
