"use client";

import { CheckmarkCircle02Icon, Link04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { IconSquare } from "@/components/icon-square";
import { SOCIAL_PLATFORM_META } from "@/components/social-platforms";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSocialConnections } from "@/src/hooks/use-social-connections";

/** Mensagens amigáveis por motivo de falha vindo do callback/connect. */
const REASON_MESSAGES: Record<string, string> = {
  SOCIAL_PROVIDER_NOT_CONFIGURED:
    "Integração não configurada no servidor (credenciais ausentes).",
  SOCIAL_STATE_INVALID: "A solicitação expirou. Tente conectar novamente.",
  SOCIAL_OAUTH_FAILED: "O provedor recusou a conexão. Tente novamente.",
};

export function SocialConnectionsSection({
  slug,
  configuredSlugs,
}: {
  slug: string;
  /** Slugs de plataformas com credenciais presentes no servidor. */
  configuredSlugs: string[];
}) {
  const { connections, isLoading, disconnect } = useSocialConnections(slug);
  const [pending, setPending] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handledReturn = useRef(false);

  // Toast de retorno do fluxo OAuth (?social=&status=&reason=), uma única vez.
  useEffect(() => {
    if (handledReturn.current) return;
    const status = searchParams.get("status");
    if (!status) return;
    handledReturn.current = true;

    const platformSlug = searchParams.get("social");
    const meta = SOCIAL_PLATFORM_META.find((p) => p.slug === platformSlug);
    const label = meta?.label ?? "Rede social";

    if (status === "connected") {
      toast.success(`${label} conectado com sucesso.`);
    } else {
      const reason = searchParams.get("reason");
      toast.error(
        (reason && REASON_MESSAGES[reason]) ??
          `Não foi possível conectar ${label}.`,
      );
    }
    router.replace(pathname);
  }, [searchParams, router, pathname]);

  const byPlatform = new Map(connections.map((c) => [c.platform, c]));

  function handleConnect(platformSlug: string) {
    window.location.href = `/api/workspaces/${slug}/social/${platformSlug}/connect`;
  }

  async function handleDisconnect(platformSlug: string, label: string) {
    setPending(platformSlug);
    const result = await disconnect(platformSlug);
    setPending(null);
    if (result.ok) toast.success(`${label} desconectado.`);
    else
      toast.error(result.message ?? `Não foi possível desconectar ${label}.`);
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 space-y-1">
        <h2 className="font-heading font-semibold text-lg tracking-tight">
          Redes sociais
        </h2>
        <p className="text-muted-foreground text-sm">
          Conecte as contas da empresa para integrar com cada plataforma.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {SOCIAL_PLATFORM_META.map((meta) => {
          const connection = byPlatform.get(meta.platform);
          const isConfigured = configuredSlugs.includes(meta.slug);
          const isPending = pending === meta.slug;

          return (
            <Card
              key={meta.platform}
              size="sm"
              className="flex-row items-center justify-between gap-4 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <IconSquare
                  icon={meta.icon}
                  color={meta.color}
                  className="size-9 rounded-lg [&_svg]:size-5"
                />
                <div className="min-w-0">
                  <p className="font-medium text-sm">{meta.label}</p>
                  {isLoading ? (
                    <Skeleton className="mt-1 h-3.5 w-32" />
                  ) : connection ? (
                    <span className="flex items-center gap-1 text-emerald-600 text-xs dark:text-emerald-400">
                      <HugeiconsIcon
                        icon={CheckmarkCircle02Icon}
                        className="size-3.5"
                      />
                      <span className="truncate">
                        Conectado
                        {connection.accountName
                          ? ` · ${connection.accountName}`
                          : ""}
                      </span>
                    </span>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      {isConfigured ? "Não conectado" : "Não configurado"}
                    </p>
                  )}
                </div>
              </div>

              {connection ? (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDisconnect(meta.slug, meta.label)}
                >
                  {isPending ? "Desconectando…" : "Desconectar"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isConfigured || isLoading}
                  onClick={() => handleConnect(meta.slug)}
                >
                  <HugeiconsIcon icon={Link04Icon} className="size-4" />
                  Conectar
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
