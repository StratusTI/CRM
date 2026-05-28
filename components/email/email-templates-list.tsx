"use client";

import {
  Delete02Icon,
  Edit02Icon,
  Mail01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { deleteEmailTemplate } from "@/src/hooks/use-email-templates";
import { useResourceList } from "@/src/hooks/use-resource-list";
import type { EmailTemplateDTO } from "@/src/schemas/email-template.schema";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EmailTemplatesList({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<EmailTemplateDTO>(
    slug,
    "email-templates",
  );
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const onDelete = async (id: string) => {
    if (confirmId !== id) {
      setConfirmId(id);
      setTimeout(() => setConfirmId(null), 3000);
      return;
    }
    const res = await deleteEmailTemplate(slug, id);
    if (!res.ok) {
      toast.error(res.message ?? "Falha ao excluir");
      return;
    }
    toast.success("Template excluído");
    refetch();
  };

  return (
    <PageShell
      action={
        <Button
          nativeButton={false}
          render={
            <Link href={`/${slug}/marketing/templates/new`}>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
              <span>Novo template</span>
            </Link>
          }
        />
      }
    >
      <div className="p-4 sm:p-6">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-lg bg-muted/40"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Nenhum template ainda</CardTitle>
              <CardDescription>
                Crie um template reutilizável para suas campanhas de email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                nativeButton={false}
                render={
                  <Link href={`/${slug}/marketing/templates/new`}>
                    <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
                    <span>Criar template</span>
                  </Link>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((t) => (
              <Card key={t.id} className="group flex flex-col">
                <CardHeader className="flex-row items-start gap-3">
                  <div className="rounded-md bg-amber-500/15 p-2 text-amber-500">
                    <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate">{t.name}</CardTitle>
                    <CardDescription className="truncate">
                      {t.subject}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between text-muted-foreground text-xs">
                  <span>Atualizado em {formatDate(t.updatedAt)}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      nativeButton={false}
                      render={
                        <Link
                          href={`/${slug}/marketing/templates/${t.id}`}
                          aria-label="Editar template"
                        >
                          <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} />
                        </Link>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onDelete(t.id)}
                      aria-label={
                        confirmId === t.id
                          ? "Clique novamente para confirmar"
                          : "Excluir"
                      }
                      className={
                        confirmId === t.id ? "text-destructive" : undefined
                      }
                    >
                      <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
