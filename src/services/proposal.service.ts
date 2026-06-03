import { createHash, randomBytes } from "node:crypto";
import type { DocumentType, Proposal } from "@prisma/client";
import {
  documentTemplateNotFound,
  proposalNotFound,
  proposalNotPublished,
} from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import {
  toProposalDTO,
  toProposalListItemDTO,
  toProposalMetricsDTO,
  toPublicProposalDTO,
} from "@/src/mappers/proposal.mapper";
import { DocumentTemplateRepository } from "@/src/repositories/document-template.repository";
import {
  ProposalRepository,
  type UpdateProposalData,
} from "@/src/repositories/proposal.repository";
import type {
  CreateProposalInput,
  ProposalDTO,
  ProposalMetricsDTO,
  PublicProposalDTO,
  RecordViewInput,
  UpdateProposalInput,
} from "@/src/schemas/proposal.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

/** Token opaco do link público — emitido no servidor, estável por proposta. */
function makeShareToken(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Hash salgado do IP do visitante. Nunca guardamos o IP cru (LGPD); o hash só
 * serve para contar visitantes únicos. Salgado com o secret do servidor.
 */
function hashIp(ip: string): string {
  const salt = process.env.BETTER_AUTH_SECRET ?? "nexo-proposal";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

async function loadInWorkspace(
  workspaceId: string,
  id: string,
): Promise<Result<Proposal>> {
  const found = await ProposalRepository.findById(id);
  if (!found.ok) return found;
  const proposal = found.value;
  if (!proposal || proposal.workspaceId !== workspaceId || proposal.deletedAt) {
    return err(proposalNotFound());
  }
  return ok(proposal);
}

/** Contexto da visita pública, extraído do request (nunca do corpo). */
export type ViewContext = { ip: string; referrer: string | null };

export const ProposalService = {
  async create(
    userId: string,
    slug: string,
    input: CreateProposalInput,
  ): Promise<Result<ProposalDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const type: DocumentType = input.type ?? "PROPOSAL";
    let title = input.title ?? "Documento sem título";
    let content = input.content ?? "";

    // Criação a partir de um template: copia o conteúdo (e o título, se o
    // cliente não enviou um). O template precisa ser do mesmo workspace e tipo.
    if (input.templateId) {
      const found = await DocumentTemplateRepository.findById(input.templateId);
      if (!found.ok) return found;
      const template = found.value;
      if (
        !template ||
        template.workspaceId !== ws.value ||
        template.type !== type ||
        template.deletedAt
      ) {
        return err(documentTemplateNotFound());
      }
      content = template.content;
      if (!input.title) title = template.title;
    }

    const created = await ProposalRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      title,
      content,
      type,
      shareToken: makeShareToken(),
    });
    if (!created.ok) return created;
    return ok(toProposalDTO(created.value));
  },

  async list(userId: string, slug: string): Promise<Result<ProposalDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const result = await ProposalRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map(toProposalListItemDTO));
  },

  async getById(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<ProposalDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const proposal = await loadInWorkspace(ws.value, id);
    if (!proposal.ok) return proposal;
    return ok(toProposalDTO(proposal.value));
  },

  async update(
    userId: string,
    slug: string,
    id: string,
    input: UpdateProposalInput,
  ): Promise<Result<ProposalDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const data: UpdateProposalData = { updatedById: userId, ...input };
    // Carimba o 1º publish; despublicar não apaga o timestamp original.
    if (input.status === "PUBLISHED" && !existing.value.publishedAt) {
      data.publishedAt = new Date();
    }

    const updated = await ProposalRepository.update(id, data);
    if (!updated.ok) return updated;
    return ok(toProposalDTO(updated.value));
  },

  async remove(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<ProposalDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const removed = await ProposalRepository.softDelete(id, userId);
    if (!removed.ok) return removed;
    return ok(toProposalDTO(removed.value));
  },

  /** Persiste a ordem manual das propostas (drag-drop). */
  async reorder(
    userId: string,
    slug: string,
    ids: string[],
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    return ProposalRepository.reorder(ws.value, ids);
  },

  async getMetrics(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<ProposalMetricsDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const proposal = await loadInWorkspace(ws.value, id);
    if (!proposal.ok) return proposal;

    const metrics = await ProposalRepository.metricsFor(id);
    if (!metrics.ok) return metrics;
    return ok(toProposalMetricsDTO(metrics.value));
  },

  /* --------------------------- público (sem auth) ------------------------ */

  /** Resolve a proposta pelo token público — só se estiver PUBLISHED. */
  async getPublicByToken(token: string): Promise<Result<PublicProposalDTO>> {
    const found = await ProposalRepository.findByShareToken(token);
    if (!found.ok) return found;
    if (!found.value) return err(proposalNotFound());
    if (found.value.status !== "PUBLISHED") return err(proposalNotPublished());
    return ok(toPublicProposalDTO(found.value));
  },

  /** Registra/atualiza uma visita (beacon da página pública). */
  async recordView(
    token: string,
    input: RecordViewInput,
    ctx: ViewContext,
  ): Promise<Result<true>> {
    const found = await ProposalRepository.findByShareToken(token);
    if (!found.ok) return found;
    if (!found.value) return err(proposalNotFound());
    if (found.value.status !== "PUBLISHED") return err(proposalNotPublished());

    const recorded = await ProposalRepository.recordView({
      proposalId: found.value.id,
      viewId: input.viewId,
      ipHash: hashIp(ctx.ip),
      durationMs: input.durationMs,
      reachedEnd: input.reachedEnd,
      scrolledPct: input.scrolledPct,
      referrer: ctx.referrer,
    });
    if (!recorded.ok) return recorded;
    return ok(true);
  },
};
