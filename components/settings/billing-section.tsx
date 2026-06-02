"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiUrl } from "@/lib/api-url";

type BillingData = {
  model: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  currentMonthInputTokens: number;
  currentMonthOutputTokens: number;
  currentMonthCostUsd: number;
  usageByDay: {
    date: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  }[];
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatUsd(n: number): string {
  if (n < 0.01) return "< $0,01";
  return `$${n.toFixed(2)}`;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="flex flex-col gap-1 p-5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-heading font-semibold text-2xl tracking-tight">
        {value}
      </span>
      {sub ? <span className="text-muted-foreground text-xs">{sub}</span> : null}
    </Card>
  );
}

export function BillingSection({ slug }: { slug: string }) {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl(`/api/workspaces/${slug}/billing`))
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setData(j.data as BillingData);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 space-y-1">
        <h2 className="font-heading font-semibold text-lg tracking-tight">
          Uso de IA
        </h2>
        <p className="text-muted-foreground text-sm">
          Consumo de tokens do assistente IA e estimativa de custo.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : !data ? (
        <p className="text-muted-foreground text-sm">
          Não foi possível carregar os dados de uso.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Mês atual</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard
                label="Tokens de entrada"
                value={formatTokens(data.currentMonthInputTokens)}
              />
              <StatCard
                label="Tokens de saída"
                value={formatTokens(data.currentMonthOutputTokens)}
              />
              <StatCard
                label="Custo estimado"
                value={formatUsd(data.currentMonthCostUsd)}
                sub={`Modelo: ${data.model}`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-sm">Total acumulado</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard
                label="Tokens de entrada"
                value={formatTokens(data.totalInputTokens)}
              />
              <StatCard
                label="Tokens de saída"
                value={formatTokens(data.totalOutputTokens)}
              />
              <StatCard
                label="Custo estimado total"
                value={formatUsd(data.totalCostUsd)}
              />
            </div>
          </div>

          {data.usageByDay.length > 0 ? (
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Últimos 30 dias</h3>
              <Card className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">
                        Data
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">
                        Entrada
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">
                        Saída
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">
                        Custo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[...data.usageByDay]
                      .sort((a, b) => (a.date < b.date ? 1 : -1))
                      .map((row) => (
                        <tr key={row.date} className="hover:bg-muted/30">
                          <td className="px-4 py-2 tabular-nums text-xs">
                            {row.date}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-xs">
                            {formatTokens(row.inputTokens)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-xs">
                            {formatTokens(row.outputTokens)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-xs">
                            {formatUsd(row.costUsd)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </Card>
            </div>
          ) : null}

          {data.totalInputTokens === 0 && data.totalOutputTokens === 0 ? (
            <p className="text-center text-muted-foreground text-sm">
              Nenhum uso de IA registrado ainda. Comece uma conversa com o
              assistente.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
