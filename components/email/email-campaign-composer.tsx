"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  RecipientPicker,
  type RecipientSelection,
} from "@/components/email/recipient-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/api-url";
import { createEmailCampaign } from "@/src/hooks/use-email-campaigns";
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

type EditorRef = {
  getEmailHTML: () => Promise<string>;
  getJSON: () => unknown;
  editor: { commands: { setContent: (c: unknown) => void } } | null;
};

export function EmailCampaignComposer({ slug }: { slug: string }) {
  const router = useRouter();
  const editorRef = useRef<EditorRef | null>(null);
  const [subject, setSubject] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const [recipients, setRecipients] = useState<RecipientSelection>({
    scope: "all",
  });
  const [templates, setTemplates] = useState<EmailTemplateDTO[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [initialContent, setInitialContent] = useState<unknown>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          apiUrl(`/api/workspaces/${slug}/email-templates`),
        );
        const json = await res.json();
        if (res.ok && json.success && Array.isArray(json.data)) {
          setTemplates(json.data as EmailTemplateDTO[]);
        }
      } catch {
        // silencioso — composer funciona sem templates
      }
    })();
  }, [slug]);

  const applyTemplate = (templateId: string) => {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    setSubject(t.subject);
    const content = t.contentJson
      ? (() => {
          try {
            return JSON.parse(t.contentJson);
          } catch {
            return t.contentHtml;
          }
        })()
      : t.contentHtml;
    if (editorReady && editorRef.current?.editor) {
      editorRef.current.editor.commands.setContent(content as never);
    } else {
      setInitialContent(content);
    }
  };

  const onSubmit = async () => {
    if (!subject.trim()) {
      toast.error("Informe o assunto");
      return;
    }
    if (
      recipients.scope === "selected" &&
      recipients.personIds.length === 0
    ) {
      toast.error("Selecione ao menos uma pessoa");
      return;
    }
    const html = (await editorRef.current?.getEmailHTML())?.trim();
    if (!html) {
      toast.error("Conteúdo vazio");
      return;
    }
    const json = JSON.stringify(editorRef.current?.getJSON() ?? null);

    let scheduledAtISO: string | undefined;
    if (scheduleEnabled) {
      if (!scheduledAtLocal) {
        toast.error("Informe a data e hora do agendamento");
        return;
      }
      const date = new Date(scheduledAtLocal);
      if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
        toast.error("Data de agendamento deve ser no futuro");
        return;
      }
      scheduledAtISO = date.toISOString();
    }

    setSubmitting(true);
    try {
      const res = await createEmailCampaign(slug, {
        subject,
        contentHtml: html,
        contentJson: json,
        recipientScope: recipients.scope,
        personIds:
          recipients.scope === "selected" ? recipients.personIds : undefined,
        scheduledAt: scheduledAtISO,
      });
      if (!res.ok || !res.data) {
        toast.error(res.message ?? "Falha ao enviar");
        return;
      }
      toast.success(
        scheduledAtISO ? "Campanha agendada" : "Campanha enviada",
      );
      router.push(`/${slug}/marketing/campaigns/${res.data.id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="subject">Assunto</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Novidades de junho"
              className="mt-1.5"
            />
          </div>

          {templates.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Usar template:</span>
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t.id)}
                  className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted"
                >
                  {t.name}
                </button>
              ))}
            </div>
          ) : null}

          <div className="min-h-[480px]">
            <EmailEditorShell
              ref={(r) => {
                editorRef.current = r as EditorRef | null;
                if (r) setEditorReady(true);
              }}
              initialContent={initialContent as never}
            />
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 font-semibold text-sm">Destinatários</h2>
            <RecipientPicker
              slug={slug}
              value={recipients}
              onChange={setRecipients}
            />
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 font-semibold text-sm">Agendamento</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
              />
              <span>Enviar mais tarde</span>
            </label>
            {scheduleEnabled ? (
              <div className="mt-3">
                <Input
                  type="datetime-local"
                  value={scheduledAtLocal}
                  onChange={(e) => setScheduledAtLocal(e.target.value)}
                />
                <p className="mt-1.5 text-muted-foreground text-xs">
                  Hora local. A campanha será enviada pelo Resend nesta data.
                </p>
              </div>
            ) : null}
          </section>
        </aside>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href={`/${slug}/marketing/campaigns`}>Cancelar</Link>}
          disabled={submitting}
        />
        <Button onClick={onSubmit} disabled={submitting}>
          {submitting
            ? "Enviando…"
            : scheduleEnabled
              ? "Agendar envio"
              : "Enviar agora"}
        </Button>
      </div>
    </div>
  );
}
