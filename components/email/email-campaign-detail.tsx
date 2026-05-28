"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useEmailCampaign } from "@/src/hooks/use-email-campaigns";
import type {
  CampaignStatus,
  RecipientStatus,
} from "@/src/schemas/email-campaign.schema";

const STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: "Rascunho",
  SCHEDULED: "Agendada",
  SENDING: "Enviando",
  SENT: "Enviada",
  FAILED: "Falhou",
};

const STATUS_STYLE: Record<CampaignStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SCHEDULED: "bg-amber-500/15 text-amber-500",
  SENDING: "bg-sky-500/15 text-sky-500",
  SENT: "bg-emerald-500/15 text-emerald-500",
  FAILED: "bg-destructive/15 text-destructive",
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

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EmailCampaignDetail({
  slug,
  id,
}: {
  slug: string;
  id: string;
}) {
  const { campaign, isLoading, error } = useEmailCampaign(slug, id);

  return (
    <PageShell
      action={
        <Button
          variant="ghost"
          nativeButton={false}
          render={
            <Link href={`/${slug}/marketing/campaigns`}>
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
              <span>Voltar</span>
            </Link>
          }
        />
      }
    >
      <div className="p-4 sm:p-6">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-8 w-1/2 animate-pulse rounded-md bg-muted/40" />
            <div className="h-64 animate-pulse rounded-lg bg-muted/40" />
          </div>
        ) : error || !campaign ? (
          <div className="text-muted-foreground text-sm">
            {error ?? "Campanha não encontrada"}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="flex flex-col gap-3">
              <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="truncate font-semibold text-xl">
                    {campaign.subject}
                  </h1>
                  <p className="mt-1 text-muted-foreground text-sm">
                    De {campaign.fromAddress}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_STYLE[campaign.status]}`}
                >
                  {STATUS_LABEL[campaign.status]}
                </span>
              </header>
              <div
                className="prose prose-sm max-w-none rounded-lg border border-border bg-card p-4 dark:prose-invert"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML é gerado pelo editor do usuário (mesmo workspace)
                dangerouslySetInnerHTML={{ __html: campaign.contentHtml }}
              />
            </div>

            <aside className="flex flex-col gap-4">
              <section className="rounded-lg border border-border bg-card p-4">
                <h2 className="mb-2 font-semibold text-sm">Datas</h2>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Criada</dt>
                    <dd>{formatDate(campaign.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Agendada</dt>
                    <dd>{formatDate(campaign.scheduledAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Enviada</dt>
                    <dd>{formatDate(campaign.sentAt)}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-lg border border-border bg-card p-4">
                <h2 className="mb-2 font-semibold text-sm">Resumo</h2>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Destinatários</dt>
                    <dd>{campaign.recipientCount}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Enviados</dt>
                    <dd className="text-emerald-500">{campaign.sentCount}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Falhas</dt>
                    <dd className="text-destructive">
                      {campaign.failedCount}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-lg border border-border bg-card p-4">
                <h2 className="mb-2 font-semibold text-sm">
                  Destinatários ({campaign.recipients.length})
                </h2>
                <ul className="max-h-96 divide-y divide-border overflow-auto">
                  {campaign.recipients.map((r) => (
                    <li key={r.id} className="py-2">
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
              </section>
            </aside>
          </div>
        )}
      </div>
    </PageShell>
  );
}
