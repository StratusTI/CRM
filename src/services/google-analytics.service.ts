import type { SocialConnection } from "@prisma/client";
import {
  socialConnectionNotFound,
  socialScopeMissing,
} from "@/src/errors/app-error";
import { err, type Result } from "@/src/lib/result";
import {
  fetchInsights,
  fetchOverview,
} from "@/src/lib/social/google-analytics/client";
import {
  type GoogleAnalyticsInsights,
  type GoogleAnalyticsInsightsRange,
  type GoogleAnalyticsOverview,
  INSIGHTS_RANGE_DAYS,
} from "@/src/schemas/google-analytics.schema";
import { getFreshAccessToken } from "@/src/services/social-token";

/** Escopos exigidos por capacidade — usados para detectar conexões antigas. */
const REQUIRED_SCOPES = {
  read: "analytics.readonly",
} as const;

/** Data UTC `YYYY-MM-DD` deslocada por `days` (negativo = no passado). */
function isoDate(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** A conexão concedeu o escopo pedido? (scope é string separada por espaços). */
function hasScope(connection: SocialConnection, needle: string): boolean {
  return (connection.scope ?? "").includes(needle);
}

/**
 * GA armazena o `properties/<id>` selecionado no momento do connect dentro de
 * `externalAccountId`. Se ficou como "unknown" (usuário sem propriedades GA4
 * acessíveis), tratamos como conexão inválida — só reconectar quando houver.
 */
function resolvePropertyId(connection: SocialConnection): string | null {
  const id = connection.externalAccountId;
  return id && id !== "unknown" ? id : null;
}

export const GoogleAnalyticsService = {
  /** Visão da propriedade: identidade + totais da janela padrão (28d). */
  async getOverview(
    userId: string,
    slug: string,
  ): Promise<Result<GoogleAnalyticsOverview>> {
    const fresh = await getFreshAccessToken(userId, slug, "GOOGLE_ANALYTICS");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.read)) {
      return err(socialScopeMissing());
    }
    const propertyId = resolvePropertyId(fresh.value.connection);
    if (!propertyId) return err(socialConnectionNotFound());

    return fetchOverview(fresh.value.accessToken, propertyId);
  },

  /** Analytics (resumo + série diária) para a janela pedida. */
  async getInsights(
    userId: string,
    slug: string,
    range: GoogleAnalyticsInsightsRange,
  ): Promise<Result<GoogleAnalyticsInsights>> {
    const fresh = await getFreshAccessToken(userId, slug, "GOOGLE_ANALYTICS");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.read)) {
      return err(socialScopeMissing());
    }
    const propertyId = resolvePropertyId(fresh.value.connection);
    if (!propertyId) return err(socialConnectionNotFound());

    return fetchInsights(fresh.value.accessToken, propertyId, {
      range,
      startDate: isoDate(-INSIGHTS_RANGE_DAYS[range]),
      endDate: isoDate(-1),
    });
  },
};
