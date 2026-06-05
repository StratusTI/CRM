import { CompanyService } from "@/src/services/company.service";
import { DashboardService } from "@/src/services/dashboard.service";
import { DocumentTemplateService } from "@/src/services/document-template.service";
import { EmailCampaignService } from "@/src/services/email-campaign.service";
import { FacebookService } from "@/src/services/facebook.service";
import { ForecastService } from "@/src/services/forecast.service";
import { GoogleAnalyticsService } from "@/src/services/google-analytics.service";
import { InstagramService } from "@/src/services/instagram.service";
import { LeadService } from "@/src/services/lead.service";
import { NoteService } from "@/src/services/note.service";
import { OpportunityService } from "@/src/services/opportunity.service";
import { PersonService } from "@/src/services/person.service";
import { PipelineService } from "@/src/services/pipeline.service";
import { ProductService } from "@/src/services/product.service";
import { ProposalService } from "@/src/services/proposal.service";
import { ReportService } from "@/src/services/report.service";
import { TaskService } from "@/src/services/task.service";
import { TiktokService } from "@/src/services/tiktok.service";
import { TwitterService } from "@/src/services/twitter.service";
import { YoutubeService } from "@/src/services/youtube.service";
import type { ToolDef } from "./client";

export type ToolContext = { userId: string; slug: string };

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const NOTE_PREVIEW = 280;

const limitParam = {
  type: "object",
  properties: {
    limit: {
      type: "number",
      description: `Máximo de itens a retornar (default ${DEFAULT_LIMIT}).`,
    },
  },
  additionalProperties: false,
} as const;

const socialRangeParam = {
  type: "object",
  properties: {
    range: {
      type: "string",
      enum: ["7d", "28d", "90d"],
      description:
        "Janela de tempo: 7d (7 dias), 28d (28 dias) ou 90d (90 dias). Default: 28d.",
    },
  },
  additionalProperties: false,
} as const;

const youtubeRangeParam = {
  type: "object",
  properties: {
    range: {
      type: "string",
      enum: ["7d", "28d", "90d", "365d"],
      description: "Janela de tempo: 7d, 28d, 90d ou 365d. Default: 28d.",
    },
  },
  additionalProperties: false,
} as const;

const forecastPeriodParam = {
  type: "object",
  properties: {
    period: {
      type: "string",
      enum: ["MONTH", "QUARTER"],
      description:
        "Granularidade do período: MONTH (mês) ou QUARTER (trimestre). Default: MONTH.",
    },
  },
  additionalProperties: false,
} as const;

const documentTypeParam = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["PREMISES", "PORTFOLIO", "PROPOSAL", "CONTRACT"],
      description:
        "Filtra por tipo de documento: PREMISES (premissas), PORTFOLIO (portfólio), PROPOSAL (proposta) ou CONTRACT (contrato). Omita para listar todos.",
    },
  },
  additionalProperties: false,
} as const;

/** Tools de LEITURA expostas ao modelo. Nenhuma escreve no banco. */
export const AI_TOOLS: ToolDef[] = [
  // ── CRM ──────────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_workspace_overview",
      description:
        "Resumo agregado do workspace em uma única chamada: contagens de empresas, pessoas, oportunidades, tarefas, notas, propostas (total, por status, total de visualizações) e campanhas de e-mail (total, por status, total de e-mails enviados). Pipeline de oportunidades por estágio (count + soma de valores) e tarefas por status. Use isto primeiro para perguntas gerais, de totais ou quando o usuário pedir uma visão geral.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_companies",
      description:
        "Lista as empresas (clientes) do workspace com campos principais (nome, domínio, nº de funcionários, ARR, ICP).",
      parameters: limitParam,
    },
  },
  {
    type: "function",
    function: {
      name: "list_people",
      description:
        "Lista os contatos/pessoas do workspace (nome, emails, cargo, cidade, empresa).",
      parameters: limitParam,
    },
  },
  {
    type: "function",
    function: {
      name: "list_opportunities",
      description:
        "Lista as oportunidades (negócios) do workspace com valor, estágio e data de fechamento.",
      parameters: limitParam,
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description:
        "Lista as tarefas do workspace com status, prazo e responsável.",
      parameters: limitParam,
    },
  },
  {
    type: "function",
    function: {
      name: "list_notes",
      description:
        "Lista as notas/anotações do workspace (título e prévia do conteúdo).",
      parameters: limitParam,
    },
  },
  {
    type: "function",
    function: {
      name: "list_dashboards",
      description: "Lista os dashboards do workspace (título).",
      parameters: limitParam,
    },
  },
  {
    type: "function",
    function: {
      name: "list_leads",
      description:
        "Lista os leads do workspace (topo do funil, antes de virarem pessoa/oportunidade) com nome, empresa, cargo, origem, status (NEW/WORKING/QUALIFIED/UNQUALIFIED/CONVERTED), pontuação (score) e responsável. Leads convertidos trazem os IDs da pessoa/oportunidade gerada. Use para analisar qualificação, priorização e roteamento.",
      parameters: limitParam,
    },
  },
  {
    type: "function",
    function: {
      name: "list_products",
      description:
        "Lista o catálogo de produtos/serviços do workspace: nome, SKU, preço unitário, moeda, tipo de cobrança (ONE_TIME/MONTHLY/YEARLY) e se está ativo. Use para perguntas sobre preços, mix de produtos ou o que é vendido.",
      parameters: limitParam,
    },
  },

  // ── Forecast / Previsão ───────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_forecast",
      description:
        "Previsão de receita por responsável e período. Para cada vendedor traz: receita já ganha (wonAmount), pipeline aberto ponderado pela probabilidade (weightedOpenAmount), previsão total (forecastAmount), contagem de oportunidades abertas/ganhas, meta do período (quotaAmount) e atingimento (%). Use para analisar pipeline futuro, metas e desempenho da equipe de vendas.",
      parameters: forecastPeriodParam,
    },
  },

  // ── Documentos (Propostas) ────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "list_proposals",
      description:
        "Lista os documentos comerciais do workspace (a vertical 'Documentos' da UI): título, tipo (PREMISES/PORTFOLIO/PROPOSAL/CONTRACT), status (DRAFT/PUBLISHED/ARCHIVED), total de visualizações, data de publicação e criação. Use para ter o portfólio completo antes de aprofundar métricas de um documento específico.",
      parameters: limitParam,
    },
  },
  {
    type: "function",
    function: {
      name: "list_document_templates",
      description:
        "Lista os templates de documento reutilizáveis do workspace, opcionalmente filtrados por tipo (PREMISES/PORTFOLIO/PROPOSAL/CONTRACT). Cada template tem título e tipo. Use para saber quais modelos estão disponíveis para gerar novos documentos.",
      parameters: documentTypeParam,
    },
  },
  {
    type: "function",
    function: {
      name: "get_proposal_metrics",
      description:
        "Métricas detalhadas de uma proposta específica: total de visualizações, visitantes únicos, taxa de conclusão (reachedEnd %), duração média de leitura e visualizações recentes. Chame após list_proposals para obter o ID.",
      parameters: {
        type: "object",
        properties: {
          proposalId: {
            type: "string",
            description: "ID da proposta (obtido via list_proposals).",
          },
        },
        required: ["proposalId"],
        additionalProperties: false,
      },
    },
  },

  // ── Relatórios ────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "list_reports",
      description:
        "Lista os relatórios salvos do workspace: nome, fonte de dados (companies/people/opportunities/leads/tasks/notes/products), colunas, filtros, agrupamento e ordenação. Use para descobrir quais relatórios existem antes de executar um com get_report_data.",
      parameters: limitParam,
    },
  },
  {
    type: "function",
    function: {
      name: "get_report_data",
      description:
        "Executa um relatório salvo e retorna as linhas processadas (já filtradas, agrupadas e ordenadas conforme a definição). Quando agrupado, traz a contagem por grupo. Chame após list_reports para obter o ID.",
      parameters: {
        type: "object",
        properties: {
          reportId: {
            type: "string",
            description: "ID do relatório (obtido via list_reports).",
          },
        },
        required: ["reportId"],
        additionalProperties: false,
      },
    },
  },

  // ── Campanhas de e-mail ───────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "list_email_campaigns",
      description:
        "Lista as campanhas de e-mail do workspace: assunto, status (SCHEDULED/SENDING/SENT/FAILED), total de destinatários, contagem de envios e falhas, taxa de entrega, data de envio/agendamento. Use para uma visão panorâmica do marketing por e-mail.",
      parameters: limitParam,
    },
  },
  {
    type: "function",
    function: {
      name: "get_email_campaign_details",
      description:
        "Detalhes completos de uma campanha de e-mail específica: métricas de entrega, endereço de origem, escopo de destinatários e amostra de falhas (se houver). Chame após list_email_campaigns para obter o ID.",
      parameters: {
        type: "object",
        properties: {
          campaignId: {
            type: "string",
            description: "ID da campanha (obtido via list_email_campaigns).",
          },
        },
        required: ["campaignId"],
        additionalProperties: false,
      },
    },
  },

  // ── Instagram ────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_instagram_overview",
      description:
        "Visão geral do perfil Instagram conectado: nome de usuário, seguidores, posts e bio. Use para perguntas sobre a conta do Instagram.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_instagram_insights",
      description:
        "Insights do Instagram: alcance, impressões, engajamento e série diária para a janela escolhida. Use para análises de desempenho de postagens e tendências.",
      parameters: socialRangeParam,
    },
  },

  // ── Facebook ──────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_facebook_overview",
      description:
        "Visão geral da Página do Facebook conectada: nome, seguidores, curtidas e categoria.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_facebook_insights",
      description:
        "Insights da Página do Facebook: alcance, impressões, engajamento e série diária para a janela escolhida.",
      parameters: socialRangeParam,
    },
  },

  // ── YouTube ───────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_youtube_overview",
      description:
        "Visão geral do canal YouTube conectado: nome, inscritos, visualizações totais e número de vídeos.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_youtube_insights",
      description:
        "Analytics do canal YouTube: visualizações, tempo de exibição, inscritos ganhos e série diária para a janela escolhida (até 365d).",
      parameters: youtubeRangeParam,
    },
  },

  // ── TikTok ────────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_tiktok_overview",
      description:
        "Visão geral do criador TikTok conectado: seguidores, curtidas totais e número de vídeos.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tiktok_videos",
      description:
        "Lista os vídeos recentes do TikTok com métricas por vídeo (visualizações, curtidas, comentários, compartilhamentos) e totais agregados.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },

  // ── X (Twitter) ───────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_twitter_overview",
      description:
        "Visão geral do perfil X (Twitter) conectado: nome de usuário, nome de exibição e bio. Métricas detalhadas não estão disponíveis no plano gratuito da API.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },

  // ── Google Analytics 4 ────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_google_analytics_overview",
      description:
        "Visão geral da propriedade GA4 conectada: nome da propriedade, conta e totais dos últimos 28 dias (usuários ativos, sessões, visualizações de página, eventos).",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_google_analytics_insights",
      description:
        "Analytics do GA4: usuários ativos, sessões, visualizações e série diária para a janela escolhida. Use para analisar tráfego do site e tendências.",
      parameters: socialRangeParam,
    },
  },
];

const SOCIAL_RANGES = ["7d", "28d", "90d"] as const;
const YOUTUBE_RANGES = ["7d", "28d", "90d", "365d"] as const;
type SocialRange = (typeof SOCIAL_RANGES)[number];
type YoutubeRange = (typeof YOUTUBE_RANGES)[number];

function parseLimit(rawArgs: string): number {
  try {
    const parsed = JSON.parse(rawArgs || "{}") as { limit?: unknown };
    const n = typeof parsed.limit === "number" ? parsed.limit : DEFAULT_LIMIT;
    return Math.max(1, Math.min(MAX_LIMIT, Math.floor(n)));
  } catch {
    return DEFAULT_LIMIT;
  }
}

function parseStringArg(rawArgs: string, key: string): string | null {
  try {
    const parsed = JSON.parse(rawArgs || "{}") as Record<string, unknown>;
    const val = parsed[key];
    return typeof val === "string" && val.trim().length > 0 ? val.trim() : null;
  } catch {
    return null;
  }
}

function parseSocialRange(rawArgs: string): SocialRange {
  try {
    const parsed = JSON.parse(rawArgs || "{}") as { range?: unknown };
    const r = parsed.range;
    return SOCIAL_RANGES.includes(r as SocialRange)
      ? (r as SocialRange)
      : "28d";
  } catch {
    return "28d";
  }
}

function parseYoutubeRange(rawArgs: string): YoutubeRange {
  try {
    const parsed = JSON.parse(rawArgs || "{}") as { range?: unknown };
    const r = parsed.range;
    return YOUTUBE_RANGES.includes(r as YoutubeRange)
      ? (r as YoutubeRange)
      : "28d";
  } catch {
    return "28d";
  }
}

const FORECAST_PERIODS = ["MONTH", "QUARTER"] as const;
type ForecastPeriod = (typeof FORECAST_PERIODS)[number];

function parseForecastPeriod(rawArgs: string): ForecastPeriod {
  try {
    const parsed = JSON.parse(rawArgs || "{}") as { period?: unknown };
    const p = parsed.period;
    return FORECAST_PERIODS.includes(p as ForecastPeriod)
      ? (p as ForecastPeriod)
      : "MONTH";
  } catch {
    return "MONTH";
  }
}

const DOCUMENT_TYPE_VALUES = [
  "PREMISES",
  "PORTFOLIO",
  "PROPOSAL",
  "CONTRACT",
] as const;
type DocumentTypeValue = (typeof DOCUMENT_TYPE_VALUES)[number];

function parseDocumentType(rawArgs: string): DocumentTypeValue | undefined {
  try {
    const parsed = JSON.parse(rawArgs || "{}") as { type?: unknown };
    const t = parsed.type;
    return DOCUMENT_TYPE_VALUES.includes(t as DocumentTypeValue)
      ? (t as DocumentTypeValue)
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Executa uma tool e devolve o resultado como string JSON (pronta para virar
 * a mensagem `role: "tool"`). Tudo escopado por (userId, slug) via os services
 * existentes, que já filtram soft-delete e checam membership.
 */
export async function executeTool(
  name: string,
  rawArgs: string,
  ctx: ToolContext,
): Promise<string> {
  const { userId, slug } = ctx;
  const limit = parseLimit(rawArgs);

  switch (name) {
    // ── CRM ──────────────────────────────────────────────────────────────
    case "get_workspace_overview":
      return JSON.stringify(await buildOverview(ctx));

    case "list_companies": {
      const r = await CompanyService.list(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(
        r.value.slice(0, limit).map((c) => ({
          id: c.id,
          name: c.name,
          domain: c.domain,
          employees: c.employees,
          arr: c.arr,
          icp: c.icp,
        })),
      );
    }

    case "list_people": {
      const r = await PersonService.list(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(
        r.value.slice(0, limit).map((p) => ({
          id: p.id,
          name: p.name,
          emails: p.emails,
          jobTitle: p.jobTitle,
          city: p.city,
          companyId: p.companyId,
        })),
      );
    }

    case "list_opportunities": {
      const r = await OpportunityService.list(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(
        r.value.slice(0, limit).map((o) => ({
          id: o.id,
          name: o.name,
          amount: o.amount,
          stageId: o.stageId,
          pipelineId: o.pipelineId,
          closeDate: o.closeDate,
          companyId: o.companyId,
        })),
      );
    }

    case "list_tasks": {
      const r = await TaskService.list(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(
        r.value.slice(0, limit).map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          dueDate: t.dueDate,
          assigneeId: t.assigneeId,
        })),
      );
    }

    case "list_notes": {
      const r = await NoteService.list(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(
        r.value.slice(0, limit).map((n) => ({
          id: n.id,
          title: n.title,
          preview: n.body?.slice(0, NOTE_PREVIEW) ?? null,
        })),
      );
    }

    case "list_dashboards": {
      const r = await DashboardService.list(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(
        r.value.slice(0, limit).map((d) => ({ id: d.id, title: d.title })),
      );
    }

    case "list_leads": {
      const r = await LeadService.list(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(
        r.value.slice(0, limit).map((l) => ({
          id: l.id,
          name: l.name,
          company: l.company,
          jobTitle: l.jobTitle,
          source: l.source,
          status: l.status,
          score: l.score,
          ownerId: l.ownerId,
          convertedPersonId: l.convertedPersonId,
          convertedOpportunityId: l.convertedOpportunityId,
        })),
      );
    }

    case "list_products": {
      const r = await ProductService.list(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(
        r.value.slice(0, limit).map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          unitPrice: p.unitPrice,
          currency: p.currency,
          billingType: p.billingType,
          active: p.active,
        })),
      );
    }

    // ── Forecast / Previsão ───────────────────────────────────────────────
    case "get_forecast": {
      const period = parseForecastPeriod(rawArgs);
      const r = await ForecastService.getForecast(userId, slug, period);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(r.value);
    }

    // ── Documentos (Propostas) ────────────────────────────────────────────
    case "list_proposals": {
      const r = await ProposalService.list(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(
        r.value.slice(0, limit).map((p) => ({
          id: p.id,
          title: p.title,
          type: (p as Record<string, unknown>).type ?? null,
          status: p.status,
          viewsCount: (p as Record<string, unknown>).viewsCount ?? 0,
          publishedAt: p.publishedAt,
          createdAt: p.createdAt,
        })),
      );
    }

    case "list_document_templates": {
      const type = parseDocumentType(rawArgs);
      const r = await DocumentTemplateService.list(userId, slug, type);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(
        r.value.slice(0, limit).map((t) => ({
          id: t.id,
          title: t.title,
          type: t.type,
        })),
      );
    }

    case "get_proposal_metrics": {
      const proposalId = parseStringArg(rawArgs, "proposalId");
      if (!proposalId) return toolError("proposalId é obrigatório.");
      const r = await ProposalService.getMetrics(userId, slug, proposalId);
      if (!r.ok) return toolError(r.error.message);
      const m = r.value;
      return JSON.stringify({
        totalViews: m.totalViews,
        uniqueVisitors: m.uniqueVisitors,
        completionRatePct: Math.round(m.completionRate * 100),
        avgDurationMs: m.avgDurationMs,
        avgReadingMinutes: (m.avgDurationMs / 60_000).toFixed(1),
        recentViews: m.views.slice(0, 10).map((v) => ({
          durationMs: v.durationMs,
          scrolledPct: v.scrolledPct,
          reachedEnd: v.reachedEnd,
          referrer: v.referrer,
          visitedAt: v.createdAt,
        })),
      });
    }

    // ── Relatórios ────────────────────────────────────────────────────────
    case "list_reports": {
      const r = await ReportService.list(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(
        r.value.slice(0, limit).map((rep) => ({
          id: rep.id,
          name: rep.name,
          source: rep.source,
          columns: rep.columns,
          filters: rep.filters,
          groupBy: rep.groupBy,
          sort: rep.sort,
        })),
      );
    }

    case "get_report_data": {
      const reportId = parseStringArg(rawArgs, "reportId");
      if (!reportId) return toolError("reportId é obrigatório.");
      const r = await ReportService.getData(userId, slug, reportId);
      if (!r.ok) return toolError(r.error.message);
      const d = r.value;
      return JSON.stringify({
        columns: d.columns,
        grouped: d.grouped,
        total: d.total,
        rows: d.rows.slice(0, limit),
      });
    }

    // ── Campanhas de e-mail ───────────────────────────────────────────────
    case "list_email_campaigns": {
      const r = await EmailCampaignService.list(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(
        r.value.slice(0, limit).map((c) => ({
          id: c.id,
          subject: c.subject,
          status: c.status,
          recipientCount: c.recipientCount,
          sentCount: c.sentCount,
          failedCount: c.failedCount,
          deliveryRatePct:
            c.recipientCount > 0
              ? Math.round((c.sentCount / c.recipientCount) * 100)
              : null,
          recipientScope: c.recipientScope,
          scheduledAt: c.scheduledAt,
          sentAt: c.sentAt,
          createdAt: c.createdAt,
        })),
      );
    }

    case "get_email_campaign_details": {
      const campaignId = parseStringArg(rawArgs, "campaignId");
      if (!campaignId) return toolError("campaignId é obrigatório.");
      const r = await EmailCampaignService.getById(userId, slug, campaignId);
      if (!r.ok) return toolError(r.error.message);
      const c = r.value;
      const failed = c.recipients
        .filter((rec) => rec.status === "FAILED")
        .slice(0, 10)
        .map((rec) => ({ email: rec.email, error: rec.errorMessage }));
      return JSON.stringify({
        id: c.id,
        subject: c.subject,
        status: c.status,
        fromAddress: c.fromAddress,
        recipientScope: c.recipientScope,
        recipientCount: c.recipientCount,
        sentCount: c.sentCount,
        failedCount: c.failedCount,
        deliveryRatePct:
          c.recipientCount > 0
            ? Math.round((c.sentCount / c.recipientCount) * 100)
            : null,
        scheduledAt: c.scheduledAt,
        sentAt: c.sentAt,
        createdAt: c.createdAt,
        failedSample: failed.length > 0 ? failed : null,
      });
    }

    // ── Instagram ─────────────────────────────────────────────────────────
    case "get_instagram_overview": {
      const r = await InstagramService.getOverview(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(r.value);
    }

    case "get_instagram_insights": {
      const range = parseSocialRange(rawArgs);
      const r = await InstagramService.getInsights(userId, slug, range);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(r.value);
    }

    // ── Facebook ──────────────────────────────────────────────────────────
    case "get_facebook_overview": {
      const r = await FacebookService.getOverview(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(r.value);
    }

    case "get_facebook_insights": {
      const range = parseSocialRange(rawArgs);
      const r = await FacebookService.getInsights(userId, slug, range);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(r.value);
    }

    // ── YouTube ───────────────────────────────────────────────────────────
    case "get_youtube_overview": {
      const r = await YoutubeService.getOverview(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(r.value);
    }

    case "get_youtube_insights": {
      const range = parseYoutubeRange(rawArgs);
      const r = await YoutubeService.getInsights(userId, slug, range);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(r.value);
    }

    // ── TikTok ────────────────────────────────────────────────────────────
    case "get_tiktok_overview": {
      const r = await TiktokService.getOverview(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(r.value);
    }

    case "get_tiktok_videos": {
      const r = await TiktokService.getVideos(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(r.value);
    }

    // ── X (Twitter) ───────────────────────────────────────────────────────
    case "get_twitter_overview": {
      const r = await TwitterService.getOverview(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(r.value);
    }

    // ── Google Analytics 4 ────────────────────────────────────────────────
    case "get_google_analytics_overview": {
      const r = await GoogleAnalyticsService.getOverview(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(r.value);
    }

    case "get_google_analytics_insights": {
      const range = parseSocialRange(rawArgs);
      const r = await GoogleAnalyticsService.getInsights(userId, slug, range);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(r.value);
    }

    default:
      return toolError(`Tool desconhecida: ${name}`);
  }
}

async function buildOverview(ctx: ToolContext): Promise<unknown> {
  const { userId, slug } = ctx;
  const [
    companies,
    people,
    leads,
    products,
    opportunities,
    tasks,
    notes,
    proposals,
    campaigns,
    pipelines,
  ] = await Promise.all([
    CompanyService.list(userId, slug),
    PersonService.list(userId, slug),
    LeadService.list(userId, slug),
    ProductService.list(userId, slug),
    OpportunityService.list(userId, slug),
    TaskService.list(userId, slug),
    NoteService.list(userId, slug),
    ProposalService.list(userId, slug),
    EmailCampaignService.list(userId, slug),
    PipelineService.list(userId, slug),
  ]);

  // Mapa etapaId → nome para rotular os buckets do funil de forma legível.
  const stageNames: Record<string, string> = {};
  if (pipelines.ok) {
    for (const p of pipelines.value) {
      for (const s of p.stages) stageNames[s.id] = s.name;
    }
  }

  const opps = opportunities.ok ? opportunities.value : [];
  const pipelineByStage: Record<
    string,
    { count: number; totalAmount: number }
  > = {};
  for (const o of opps) {
    const label = stageNames[o.stageId] ?? o.stageId;
    const bucket = pipelineByStage[label] ?? { count: 0, totalAmount: 0 };
    bucket.count += 1;
    bucket.totalAmount += o.amount ?? 0;
    pipelineByStage[label] = bucket;
  }

  const taskList = tasks.ok ? tasks.value : [];
  const tasksByStatus: Record<string, number> = {};
  for (const t of taskList) {
    tasksByStatus[t.status] = (tasksByStatus[t.status] ?? 0) + 1;
  }

  const leadList = leads.ok ? leads.value : [];
  const leadsByStatus: Record<string, number> = {};
  let leadScoreSum = 0;
  for (const l of leadList) {
    leadsByStatus[l.status] = (leadsByStatus[l.status] ?? 0) + 1;
    leadScoreSum += l.score ?? 0;
  }

  const productList = products.ok ? products.value : [];
  const activeProducts = productList.filter((p) => p.active).length;

  const proposalList = proposals.ok ? proposals.value : [];
  const proposalsByStatus: Record<string, number> = {};
  let proposalTotalViews = 0;
  for (const p of proposalList) {
    proposalsByStatus[p.status] = (proposalsByStatus[p.status] ?? 0) + 1;
    proposalTotalViews +=
      ((p as Record<string, unknown>).viewsCount as number) ?? 0;
  }

  const campaignList = campaigns.ok ? campaigns.value : [];
  const campaignsByStatus: Record<string, number> = {};
  let campaignTotalSent = 0;
  let campaignTotalFailed = 0;
  for (const c of campaignList) {
    campaignsByStatus[c.status] = (campaignsByStatus[c.status] ?? 0) + 1;
    campaignTotalSent += c.sentCount ?? 0;
    campaignTotalFailed += c.failedCount ?? 0;
  }

  return {
    crm: {
      companies: companies.ok ? companies.value.length : 0,
      people: people.ok ? people.value.length : 0,
      opportunities: opps.length,
      tasks: taskList.length,
      notes: notes.ok ? notes.value.length : 0,
    },
    leads: {
      total: leadList.length,
      byStatus: leadsByStatus,
      avgScore:
        leadList.length > 0 ? Math.round(leadScoreSum / leadList.length) : 0,
    },
    products: {
      total: productList.length,
      active: activeProducts,
    },
    pipelineByStage,
    tasksByStatus,
    proposals: {
      total: proposalList.length,
      byStatus: proposalsByStatus,
      totalViews: proposalTotalViews,
    },
    emailCampaigns: {
      total: campaignList.length,
      byStatus: campaignsByStatus,
      totalEmailsSent: campaignTotalSent,
      totalEmailsFailed: campaignTotalFailed,
      overallDeliveryRatePct:
        campaignTotalSent + campaignTotalFailed > 0
          ? Math.round(
              (campaignTotalSent / (campaignTotalSent + campaignTotalFailed)) *
                100,
            )
          : null,
    },
  };
}

function toolError(message: string): string {
  return JSON.stringify({ error: message });
}
