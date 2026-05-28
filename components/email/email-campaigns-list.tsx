"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useResourceList } from "@/src/hooks/use-resource-list";
import type {
  CampaignStatus,
  EmailCampaignDTO,
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

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EmailCampaignsList({ slug }: { slug: string }) {
  const { items, isLoading } = useResourceList<EmailCampaignDTO>(
    slug,
    "email-campaigns",
  );

  return (
    <PageShell
      action={
        <Button
          nativeButton={false}
          render={
            <Link href={`/${slug}/marketing/campaigns/new`}>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
              <span>Nova campanha</span>
            </Link>
          }
        />
      }
    >
      <div className="p-4 sm:p-6">
        {isLoading ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg bg-muted/40"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Nenhuma campanha ainda</CardTitle>
              <CardDescription>
                Crie sua primeira campanha de email marketing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                nativeButton={false}
                render={
                  <Link href={`/${slug}/marketing/campaigns/new`}>
                    <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
                    <span>Criar campanha</span>
                  </Link>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {items.map((c) => (
              <Link
                key={c.id}
                href={`/${slug}/marketing/campaigns/${c.id}`}
                className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.subject}</div>
                    <div className="mt-1 text-muted-foreground text-xs">
                      {c.recipientCount} destinatário(s) ·{" "}
                      {c.sentCount} enviado(s)
                      {c.failedCount > 0 ? ` · ${c.failedCount} falha(s)` : ""}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_STYLE[c.status]}`}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-muted-foreground text-xs">
                  <span>Criada em {formatDate(c.createdAt)}</span>
                  {c.scheduledAt ? (
                    <span>Agendada para {formatDate(c.scheduledAt)}</span>
                  ) : null}
                  {c.sentAt ? (
                    <span>Enviada em {formatDate(c.sentAt)}</span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
