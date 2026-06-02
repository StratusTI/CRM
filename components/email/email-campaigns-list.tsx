"use client";

import { Cancel01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import {
  RecipientPicker,
  type RecipientSelection,
} from "@/components/email/recipient-picker";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { apiUrl } from "@/lib/api-url";
import {
  createEmailCampaign,
  useEmailCampaign,
} from "@/src/hooks/use-email-campaigns";
import { useResourceList } from "@/src/hooks/use-resource-list";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import type {
  CampaignStatus,
  EmailCampaignDTO,
  RecipientStatus,
} from "@/src/schemas/email-campaign.schema";
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
    <div className="h-[420px] animate-pulse rounded-lg border border-border bg-muted/30" />
  );
}

type EditorRef = {
  getEmailHTML: () => Promise<string>;
  getJSON: () => unknown;
  editor: { commands: { setContent: (c: unknown) => void } } | null;
};

const STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: "Rascunho",
  SCHEDULED: "Agendada",
  SENDING: "Enviando",
  SENT: "Enviada",
  FAILED: "Falhou",
};

const STATUS_STYLE: Record<CampaignStatus, string> = {
  DRAFT: "bg-muted text-foreground",
  SCHEDULED: "bg-amber-500/20 text-amber-600 dark:text-amber-300",
  SENDING: "bg-sky-500/20 text-sky-600 dark:text-sky-300",
  SENT: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300",
  FAILED: "bg-destructive/20 text-destructive",
};

const RECIPIENT_LABEL: Record<RecipientStatus, string> = {
  PENDING: "Pendente",
  SENT: "Enviado",
  FAILED: "Falhou",
};

const RECIPIENT_STYLE: Record<RecipientStatus, string> = {
  PENDING: "text-muted-foreground",
  SENT: "text-emerald-500",
  FAILED: "text-destructive",
};

const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as CampaignStatus[]).map(
  (status) => ({ value: status, label: STATUS_LABEL[status] }),
);

const COLUMNS: GridColumn[] = [
  {
    key: "subject",
    header: "Assunto",
    kind: "text",
    primary: true,
    readonly: true,
    placeholder: "—",
  },
  {
    key: "status",
    header: "Status",
    kind: "select",
    readonly: true,
    options: STATUS_OPTIONS,
    optionStyles: STATUS_STYLE,
  },
  {
    key: "recipientCount",
    header: "Destinatários",
    kind: "number",
    readonly: true,
  },
  { key: "sentCount", header: "Enviados", kind: "number", readonly: true },
  { key: "failedCount", header: "Falhas", kind: "number", readonly: true },
  { key: "scheduledAt", header: "Agendada para", kind: "readonly-date" },
  { key: "sentAt", header: "Enviada em", kind: "readonly-date" },
  {
    key: "createdById",
    header: "Criada por",
    kind: "relation",
    relationKind: "users",
    readonly: true,
  },
  { key: "createdAt", header: "Criada em", kind: "readonly-date" },
];

const LOOKUP_KINDS: LookupKind[] = ["users"];

export function EmailCampaignsList({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<EmailCampaignDTO>(
    slug,
    "email-campaigns",
  );
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);
  const [viewing, setViewing] = useState<string | "new" | null>(null);

  return (
    <PageShell>
      <DataTable
        columns={COLUMNS}
        data={items}
        slug={slug}
        resource="email-campaigns"
        createTitle="campanha"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Buscar campanhas…"
        refetch={refetch}
        disableInlineCreate
        headerAction={
          <Button size="sm" onClick={() => setViewing("new")}>
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
            Nova campanha
          </Button>
        }
        onOpenRecord={(record) => setViewing(record.id)}
      />

      <CampaignSheet
        slug={slug}
        viewing={viewing}
        onClose={() => setViewing(null)}
        onSent={() => {
          setViewing(null);
          refetch();
        }}
      />
    </PageShell>
  );
}

/** Painel lateral único: composer (criar) ou detalhe (visualizar). Layout
 *  vertical single-column estilo `RichTextPanel`/`RecordPanel`. */
function CampaignSheet({
  slug,
  viewing,
  onClose,
  onSent,
}: {
  slug: string;
  viewing: string | "new" | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const open = viewing !== null;
  const isNew = viewing === "new";

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex w-[640px] max-w-[640px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px] data-[side=right]:sm:max-w-[640px]"
      >
        {!open ? null : isNew ? (
          <CampaignComposer slug={slug} onClose={onClose} onSent={onSent} />
        ) : (
          <CampaignDetail
            slug={slug}
            id={viewing as string}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function PanelHeader({
  onClose,
  title,
  badge,
}: {
  onClose: () => void;
  title: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b p-3">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        aria-label="Fechar"
      >
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
      </Button>
      <SheetTitle className="truncate">{title}</SheetTitle>
      {badge}
    </div>
  );
}

function CampaignComposer({
  slug,
  onClose,
  onSent,
}: {
  slug: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const editorRef = useRef<EditorRef | null>(null);
  const [subject, setSubject] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const [recipients, setRecipients] = useState<RecipientSelection>({
    scope: "all",
    personIds: [],
    mailingListIds: [],
    extraEmails: [],
  });
  const [templates, setTemplates] = useState<EmailTemplateDTO[]>([]);
  const [submitting, setSubmitting] = useState(false);
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
        // composer funciona sem templates
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
    if (editorRef.current?.editor) {
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
    const hasRecipients =
      recipients.scope === "all" ||
      recipients.personIds.length > 0 ||
      recipients.mailingListIds.length > 0 ||
      recipients.extraEmails.length > 0;
    if (!hasRecipients) {
      toast.error("Selecione ao menos um destinatário");
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
          recipients.scope === "selected" && recipients.personIds.length > 0
            ? recipients.personIds
            : undefined,
        mailingListIds:
          recipients.mailingListIds.length > 0
            ? recipients.mailingListIds
            : undefined,
        extraEmails:
          recipients.extraEmails.length > 0
            ? recipients.extraEmails
            : undefined,
        scheduledAt: scheduledAtISO,
      });
      if (!res.ok || !res.data) {
        toast.error(res.message ?? "Falha ao enviar");
        return;
      }
      toast.success(scheduledAtISO ? "Campanha agendada" : "Campanha enviada");
      onSent();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PanelHeader onClose={onClose} title="Nova campanha" />

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col gap-5 p-4">
          <Field label="Assunto">
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Novidades de junho"
            />
          </Field>

          {templates.length > 0 ? (
            <Field label="Templates">
              <div className="flex flex-wrap gap-1.5">
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
            </Field>
          ) : null}

          <Field label="Conteúdo">
            <div className="min-h-[420px]">
              <EmailEditorShell
                ref={(r) => {
                  editorRef.current = r as EditorRef | null;
                }}
                initialContent={initialContent as never}
              />
            </div>
          </Field>

          <Field label="Destinatários">
            <RecipientPicker
              slug={slug}
              value={recipients}
              onChange={setRecipients}
            />
          </Field>

          <Field label="Agendamento">
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
              <div className="mt-3 grid gap-1.5">
                <Input
                  type="datetime-local"
                  value={scheduledAtLocal}
                  onChange={(e) => setScheduledAtLocal(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Hora local. O Resend dispara nesta data.
                </p>
              </div>
            ) : null}
          </Field>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t p-3">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button onClick={onSubmit} disabled={submitting}>
          {submitting
            ? "Enviando…"
            : scheduleEnabled
              ? "Agendar envio"
              : "Enviar agora"}
        </Button>
      </div>
    </>
  );
}

function CampaignDetail({
  slug,
  id,
  onClose,
}: {
  slug: string;
  id: string;
  onClose: () => void;
}) {
  const { campaign, isLoading, error } = useEmailCampaign(slug, id);

  return (
    <>
      <PanelHeader
        onClose={onClose}
        title={isLoading ? "Carregando…" : (campaign?.subject ?? "Campanha")}
        badge={
          campaign ? (
            <span
              className={`ml-2 shrink-0 rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_STYLE[campaign.status]}`}
            >
              {STATUS_LABEL[campaign.status]}
            </span>
          ) : null
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {isLoading ? (
          <div className="space-y-3 p-4">
            <div className="h-6 w-1/2 animate-pulse rounded-md bg-muted/40" />
            <div className="h-64 animate-pulse rounded-lg bg-muted/40" />
          </div>
        ) : error || !campaign ? (
          <div className="p-4 text-muted-foreground text-sm">
            {error ?? "Campanha não encontrada"}
          </div>
        ) : (
          <div className="flex flex-col gap-5 p-4">
            <Field label="De">
              <span className="text-sm">{campaign.fromAddress}</span>
            </Field>

            <Field label="Conteúdo">
              <div
                className="prose prose-sm max-w-none rounded-lg border border-border bg-card p-4 dark:prose-invert"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML do próprio workspace
                dangerouslySetInnerHTML={{ __html: campaign.contentHtml }}
              />
            </Field>

            <Field label="Resumo">
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <Metric label="Destinatários" value={campaign.recipientCount} />
                <Metric
                  label="Enviados"
                  value={campaign.sentCount}
                  tone="emerald"
                />
                <Metric
                  label="Falhas"
                  value={campaign.failedCount}
                  tone="destructive"
                />
              </dl>
            </Field>

            <Field label="Datas">
              <dl className="space-y-1 text-sm">
                <DataRow
                  label="Criada"
                  value={formatDate(campaign.createdAt)}
                />
                <DataRow
                  label="Agendada"
                  value={formatDate(campaign.scheduledAt)}
                />
                <DataRow
                  label="Enviada"
                  value={formatDate(campaign.sentAt)}
                />
              </dl>
            </Field>

            <Field label={`Destinatários (${campaign.recipients.length})`}>
              <ul className="max-h-96 divide-y divide-border overflow-auto rounded-lg border border-border">
                {campaign.recipients.map((r) => (
                  <li key={r.id} className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-sm">
                          {r.name ?? r.email}
                        </div>
                        {r.name ? (
                          <div className="truncate text-muted-foreground text-xs">
                            {r.email}
                          </div>
                        ) : null}
                      </div>
                      <span
                        className={`shrink-0 text-xs ${RECIPIENT_STYLE[r.status]}`}
                      >
                        {RECIPIENT_LABEL[r.status]}
                      </span>
                    </div>
                    {r.errorMessage ? (
                      <div className="mt-1 truncate text-destructive text-xs">
                        {r.errorMessage}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Field>
          </div>
        )}
      </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "emerald" | "destructive";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-500"
      : tone === "destructive"
        ? "text-destructive"
        : "";
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={`mt-1 font-semibold text-lg ${toneClass}`}>{value}</dd>
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DataRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
