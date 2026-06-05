"use client";

import {
  Mail01Icon,
  RefreshIcon,
  UnlinkIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  connectEmailAccount,
  disconnectEmailAccount,
  type EmailAccount,
  syncEmailAccount,
  useEmailAccounts,
} from "@/src/hooks/use-email-accounts";

const PROVIDER_LABELS = { GOOGLE: "Gmail", MICROSOFT: "Outlook" } as const;

export function EmailAccountsSection({ slug }: { slug: string }) {
  const { accounts, isLoading, refetch } = useEmailAccounts(slug);
  const [busy, setBusy] = useState(false);

  async function handleConnect(provider: "GOOGLE" | "MICROSOFT") {
    setBusy(true);
    const result = await connectEmailAccount(slug, provider);
    if (!result.ok) {
      setBusy(false);
      toast.error(
        result.message ?? "Integração não configurada neste ambiente.",
      );
    }
    // sucesso redireciona para o provedor
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center gap-2.5">
        <HugeiconsIcon icon={Mail01Icon} className="size-5 text-muted-foreground" />
        <div className="space-y-1">
          <h2 className="font-heading font-semibold text-lg tracking-tight">
            E-mail & calendário
          </h2>
          <p className="text-muted-foreground text-sm">
            Conecte o Gmail ou o Outlook para sincronizar e-mails e eventos com
            os contatos do CRM.
          </p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleConnect("GOOGLE")}
          disabled={busy}
        >
          Conectar Gmail
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleConnect("MICROSOFT")}
          disabled={busy}
        >
          Conectar Outlook
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {isLoading ? (
          <Skeleton className="h-14 w-full" />
        ) : accounts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma conta conectada.
          </p>
        ) : (
          accounts.map((account) => (
            <AccountCard
              key={account.id}
              slug={slug}
              account={account}
              onChanged={refetch}
            />
          ))
        )}
      </div>
    </section>
  );
}

function AccountCard({
  slug,
  account,
  onChanged,
}: {
  slug: string;
  account: EmailAccount;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleSync() {
    setBusy(true);
    const result = await syncEmailAccount(slug, account.id);
    setBusy(false);
    if (result.ok) {
      toast.success(`Sincronizado: ${result.imported ?? 0} novos itens.`);
      onChanged();
    } else {
      toast.error(result.message ?? "Falha ao sincronizar.");
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    const result = await disconnectEmailAccount(slug, account.id);
    setBusy(false);
    if (result.ok) {
      toast.success("Conta desconectada.");
      onChanged();
    }
  }

  return (
    <Card
      size="sm"
      className="flex-row items-center justify-between gap-4 px-4 py-3"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <HugeiconsIcon icon={Mail01Icon} className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-sm">{account.email}</p>
          <p className="text-muted-foreground text-xs">
            {PROVIDER_LABELS[account.provider]}
            {account.lastSyncedAt
              ? ` · sincronizado ${format(new Date(account.lastSyncedAt), "dd/MM HH:mm", { locale: ptBR })}`
              : " · ainda não sincronizado"}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSync}
          disabled={busy}
        >
          <HugeiconsIcon icon={RefreshIcon} className="size-4" />
          Sincronizar
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDisconnect}
          disabled={busy}
          aria-label="Desconectar"
        >
          <HugeiconsIcon icon={UnlinkIcon} className="size-4" />
        </Button>
      </div>
    </Card>
  );
}
