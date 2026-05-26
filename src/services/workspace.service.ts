import { workspaceNotFound, workspaceSlugTaken } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toWorkspaceDTO } from "@/src/mappers/workspace.mapper";
import { MembershipRepository } from "@/src/repositories/membership.repository";
import { WorkspaceRepository } from "@/src/repositories/workspace.repository";
import type {
  CreateWorkspaceInput,
  WorkspaceDTO,
} from "@/src/schemas/workspace.schema";

const MAX_SLUG_ATTEMPTS = 1000;

/** Normaliza um texto livre em um slug válido (a-z, 0-9, hifens). */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

/** Deriva um slug único a partir do nome, sufixando -2, -3… se houver colisão. */
async function deriveUniqueSlug(name: string): Promise<Result<string>> {
  const base = slugify(name) || "workspace";
  let candidate = base;

  for (let attempt = 2; attempt <= MAX_SLUG_ATTEMPTS; attempt += 1) {
    const exists = await WorkspaceRepository.existsBySlug(candidate);
    if (!exists.ok) return exists;
    if (!exists.value) return ok(candidate);
    candidate = `${base}-${attempt}`;
  }

  return err(workspaceSlugTaken());
}

export const WorkspaceService = {
  /** Cria uma workspace (e a membership OWNER do criador). */
  async create(
    userId: string,
    input: CreateWorkspaceInput,
  ): Promise<Result<WorkspaceDTO>> {
    let slug: string;

    if (input.slug) {
      const exists = await WorkspaceRepository.existsBySlug(input.slug);
      if (!exists.ok) return exists;
      if (exists.value) return err(workspaceSlugTaken());
      slug = input.slug;
    } else {
      const derived = await deriveUniqueSlug(input.name);
      if (!derived.ok) return derived;
      slug = derived.value;
    }

    const created = await WorkspaceRepository.createWithOwner(
      { name: input.name, slug },
      userId,
    );
    if (!created.ok) return created;
    return ok(toWorkspaceDTO(created.value));
  },

  /** Workspaces das quais o usuário é membro. */
  async list(userId: string): Promise<Result<WorkspaceDTO[]>> {
    const result = await WorkspaceRepository.listByUserId(userId);
    if (!result.ok) return result;
    return ok(result.value.map(toWorkspaceDTO));
  },

  /** Busca por slug, garantindo que o usuário seja membro (senão 404). */
  async getBySlug(userId: string, slug: string): Promise<Result<WorkspaceDTO>> {
    const membership = await MembershipRepository.findByUserAndSlug(
      userId,
      slug,
    );
    if (!membership.ok) return membership;
    if (!membership.value) return err(workspaceNotFound());
    return ok(toWorkspaceDTO(membership.value.workspace));
  },

  /** Membros da workspace (id/nome/email/role), exige que o requisitante seja membro. */
  async listMembers(
    userId: string,
    slug: string,
  ): Promise<
    Result<
      {
        id: string;
        name: string;
        email: string;
        role: "OWNER" | "ADMIN" | "MEMBER";
      }[]
    >
  > {
    const membership = await MembershipRepository.findByUserAndSlug(
      userId,
      slug,
    );
    if (!membership.ok) return membership;
    if (!membership.value) return err(workspaceNotFound());

    const members = await MembershipRepository.listByWorkspaceId(
      membership.value.workspace.id,
    );
    if (!members.ok) return members;
    return ok(
      members.value.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      })),
    );
  },
};
