"use client";

import {
  Download04Icon,
  ShieldKeyIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiUrl } from "@/lib/api-url";
import {
  cancelAccountDeletion,
  downloadMyData,
  scheduleAccountDeletion,
} from "@/src/hooks/use-account";

export function PrivacySection() {
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl("/api/users/me"));
      const json = await res.json();
      setScheduledAt(
        res.ok && json.success ? (json.data.deletionScheduledAt ?? null) : null,
      );
    } catch {
      setScheduledAt(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  async function handleExport() {
    setBusy(true);
    const result = await downloadMyData();
    setBusy(false);
    if (!result.ok) toast.error("Não foi possível baixar seus dados.");
  }

  async function handleSchedule() {
    setBusy(true);
    const result = await scheduleAccountDeletion();
    setBusy(false);
    if (result.ok) {
      toast.success("Exclusão agendada. Você tem 30 dias para cancelar.");
      refetch();
    } else {
      toast.error(result.message ?? "Não foi possível agendar a exclusão.");
    }
  }

  async function handleCancel() {
    setBusy(true);
    const result = await cancelAccountDeletion();
    setBusy(false);
    if (result.ok) {
      toast.success("Exclusão cancelada.");
      refetch();
    } else {
      toast.error("Não foi possível cancelar.");
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center gap-2.5">
        <HugeiconsIcon
          icon={ShieldKeyIcon}
          className="size-5 text-muted-foreground"
        />
        <div className="space-y-1">
          <h2 className="font-heading font-semibold text-lg tracking-tight">
            Privacidade & dados
          </h2>
          <p className="text-muted-foreground text-sm">
            Baixe uma cópia dos seus dados ou exclua sua conta (LGPD).
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Card className="flex-row items-center justify-between gap-4 p-4">
          <div>
            <p className="font-medium text-sm">Baixar meus dados</p>
            <p className="text-muted-foreground text-xs">
              Seu perfil, consentimentos e workspaces em JSON.
            </p>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={busy}>
            <HugeiconsIcon icon={Download04Icon} className="size-4" />
            Baixar
          </Button>
        </Card>

        <Card className="flex-col gap-3 border-rose-500/30 p-4">
          <div>
            <p className="font-medium text-rose-600 text-sm dark:text-rose-400">
              Excluir minha conta
            </p>
            <p className="text-muted-foreground text-xs">
              Seus dados pessoais são anonimizados após 30 dias de carência. Se
              você for o único proprietário de uma workspace, transfira a
              propriedade antes.
            </p>
          </div>

          {isLoading ? (
            <Skeleton className="h-9 w-40" />
          ) : scheduledAt ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-amber-600 text-xs dark:text-amber-400">
                Exclusão agendada para{" "}
                {new Date(scheduledAt).toLocaleDateString("pt-BR")}.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={busy}
              >
                Cancelar exclusão
              </Button>
            </div>
          ) : (
            <Dialog>
              <DialogTrigger
                render={
                  <Button variant="destructive" size="sm" className="self-start">
                    Excluir minha conta
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Excluir sua conta?</DialogTitle>
                  <DialogDescription>
                    A exclusão é agendada com 30 dias de carência — você pode
                    cancelar nesse período. Depois disso, seus dados pessoais
                    são anonimizados de forma irreversível.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Cancelar
                  </DialogClose>
                  <DialogClose
                    render={
                      <Button
                        variant="destructive"
                        onClick={handleSchedule}
                        disabled={busy}
                      />
                    }
                  >
                    Agendar exclusão
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </Card>
      </div>
    </section>
  );
}
