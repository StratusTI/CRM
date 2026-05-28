"use client";

import { EmailTemplateEditor } from "@/components/email/email-template-editor";
import { useEmailTemplate } from "@/src/hooks/use-email-templates";

export function EmailTemplateEditorLoader({
  slug,
  id,
}: {
  slug: string;
  id: string;
}) {
  const { template, isLoading, error } = useEmailTemplate(slug, id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4 sm:p-6">
        <div className="h-9 w-full animate-pulse rounded-md bg-muted/40" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted/40" />
        <div className="h-[480px] animate-pulse rounded-lg bg-muted/40" />
      </div>
    );
  }
  if (error || !template) {
    return (
      <div className="p-6 text-muted-foreground text-sm">
        {error ?? "Template não encontrado"}
      </div>
    );
  }
  return <EmailTemplateEditor slug={slug} template={template} />;
}
