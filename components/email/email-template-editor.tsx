"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createEmailTemplate,
  updateEmailTemplate,
} from "@/src/hooks/use-email-templates";
import type { EmailTemplateDTO } from "@/src/schemas/email-template.schema";

const EmailEditorShell = dynamic(
  () =>
    import("@/components/email/email-editor-shell").then(
      (m) => m.EmailEditorShell,
    ),
  { ssr: false, loading: () => <EditorSkeleton /> },
);

function EditorSkeleton() {
  return (
    <div className="h-[480px] animate-pulse rounded-lg border border-border bg-muted/30" />
  );
}

type Props = {
  slug: string;
  template?: EmailTemplateDTO;
};

type EditorRef = {
  getEmailHTML: () => Promise<string>;
  getJSON: () => unknown;
};

export function EmailTemplateEditor({ slug, template }: Props) {
  const router = useRouter();
  const editorRef = useRef<EditorRef | null>(null);
  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [submitting, setSubmitting] = useState(false);

  const initialContent = template?.contentJson
    ? (() => {
        try {
          return JSON.parse(template.contentJson);
        } catch {
          return template.contentHtml;
        }
      })()
    : template?.contentHtml;

  const onSubmit = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome do template");
      return;
    }
    if (!subject.trim()) {
      toast.error("Informe o assunto");
      return;
    }
    const html = (await editorRef.current?.getEmailHTML())?.trim();
    if (!html) {
      toast.error("Conteúdo vazio");
      return;
    }
    const json = JSON.stringify(editorRef.current?.getJSON() ?? null);

    setSubmitting(true);
    try {
      const payload = { name, subject, contentHtml: html, contentJson: json };
      const result = template
        ? await updateEmailTemplate(slug, template.id, payload)
        : await createEmailTemplate(slug, payload);
      if (!result.ok) {
        toast.error(result.message ?? "Falha ao salvar");
        return;
      }
      toast.success(template ? "Template atualizado" : "Template criado");
      router.push(`/${slug}/marketing/templates`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Label htmlFor="name">Nome do template</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Boas-vindas"
            className="mt-1.5"
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="subject">Assunto</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Seja bem-vindo ao nosso CRM"
            className="mt-1.5"
          />
        </div>
      </div>
      <div className="min-h-[480px] flex-1">
        <EmailEditorShell
          ref={(r) => {
            editorRef.current = r as EditorRef | null;
          }}
          initialContent={initialContent ?? undefined}
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          onClick={() => router.push(`/${slug}/marketing/templates`)}
          disabled={submitting}
        >
          Cancelar
        </Button>
        <Button onClick={onSubmit} disabled={submitting}>
          {submitting ? "Salvando…" : template ? "Salvar alterações" : "Criar template"}
        </Button>
      </div>
    </div>
  );
}
