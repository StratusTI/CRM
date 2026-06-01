import type { Proposal, ProposalView } from "@prisma/client";
import type {
  ProposalMetricsRaw,
  ProposalWithCount,
} from "@/src/repositories/proposal.repository";
import type {
  ProposalDTO,
  ProposalMetricsDTO,
  ProposalViewDTO,
  PublicProposalDTO,
} from "@/src/schemas/proposal.schema";

/** `Prisma.Proposal` → `ProposalDTO` (datas em ISO). */
export function toProposalDTO(proposal: Proposal): ProposalDTO {
  return {
    id: proposal.id,
    title: proposal.title,
    content: proposal.content,
    status: proposal.status,
    shareToken: proposal.shareToken,
    publishedAt:
      proposal.publishedAt === null ? null : proposal.publishedAt.toISOString(),
    workspaceId: proposal.workspaceId,
    createdById: proposal.createdById,
    updatedById: proposal.updatedById,
    createdAt: proposal.createdAt.toISOString(),
    updatedAt: proposal.updatedAt.toISOString(),
    deletedAt:
      proposal.deletedAt === null ? null : proposal.deletedAt.toISOString(),
  };
}

/** Inclui `viewsCount` (do `_count`) — usado nas listagens. */
export function toProposalListItemDTO(
  proposal: ProposalWithCount,
): ProposalDTO {
  return { ...toProposalDTO(proposal), viewsCount: proposal._count.views };
}

/** Só o necessário para a página pública (sem campos internos). */
export function toPublicProposalDTO(proposal: Proposal): PublicProposalDTO {
  return { id: proposal.id, title: proposal.title, content: proposal.content };
}

export function toProposalViewDTO(view: ProposalView): ProposalViewDTO {
  return {
    id: view.id,
    durationMs: view.durationMs,
    reachedEnd: view.reachedEnd,
    scrolledPct: view.scrolledPct,
    referrer: view.referrer,
    createdAt: view.createdAt.toISOString(),
    updatedAt: view.updatedAt.toISOString(),
  };
}

/** Agregados crus → DTO de métricas (deriva `completionRate`). */
export function toProposalMetricsDTO(
  raw: ProposalMetricsRaw,
): ProposalMetricsDTO {
  return {
    totalViews: raw.totalViews,
    uniqueVisitors: raw.uniqueVisitors,
    completionRate: raw.totalViews ? raw.completed / raw.totalViews : 0,
    avgDurationMs: raw.avgDurationMs,
    views: raw.views.map(toProposalViewDTO),
  };
}
