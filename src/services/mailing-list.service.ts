import { mailingListNotFound } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import {
  toMailingListDTO,
  toMailingListWithMembersDTO,
} from "@/src/mappers/mailing-list.mapper";
import { MailingListRepository } from "@/src/repositories/mailing-list.repository";
import type {
  AddMailingListMembersInput,
  CreateMailingListInput,
  MailingListDTO,
  MailingListMemberDTO,
  MailingListWithMembersDTO,
  UpdateMailingListInput,
} from "@/src/schemas/mailing-list.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

export const MailingListService = {
  async create(
    userId: string,
    slug: string,
    input: CreateMailingListInput,
  ): Promise<Result<MailingListDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const result = await MailingListRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      name: input.name,
      description: input.description,
    });
    if (!result.ok) return result;
    return ok(toMailingListDTO(result.value, 0));
  },

  async list(
    userId: string,
    slug: string,
  ): Promise<Result<MailingListDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const result = await MailingListRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(
      result.value.map((l) => toMailingListDTO(l, l._count.members)),
    );
  },

  async getById(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<MailingListWithMembersDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const result = await MailingListRepository.findById(id);
    if (!result.ok) return result;
    if (!result.value || result.value.workspaceId !== ws.value) {
      return err(mailingListNotFound());
    }
    return ok(toMailingListWithMembersDTO(result.value, result.value.members));
  },

  async update(
    userId: string,
    slug: string,
    id: string,
    input: UpdateMailingListInput,
  ): Promise<Result<MailingListDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await MailingListRepository.findById(id);
    if (!existing.ok) return existing;
    if (!existing.value || existing.value.workspaceId !== ws.value) {
      return err(mailingListNotFound());
    }

    const result = await MailingListRepository.update(id, input);
    if (!result.ok) return result;
    return ok(
      toMailingListDTO(result.value, existing.value.members.length),
    );
  },

  async remove(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<void>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await MailingListRepository.findById(id);
    if (!existing.ok) return existing;
    if (!existing.value || existing.value.workspaceId !== ws.value) {
      return err(mailingListNotFound());
    }

    return MailingListRepository.softDelete(id);
  },

  async addMembers(
    userId: string,
    slug: string,
    id: string,
    input: AddMailingListMembersInput,
  ): Promise<Result<MailingListWithMembersDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await MailingListRepository.findById(id);
    if (!existing.ok) return existing;
    if (!existing.value || existing.value.workspaceId !== ws.value) {
      return err(mailingListNotFound());
    }

    const added = await MailingListRepository.addMembers(id, input.members);
    if (!added.ok) return added;

    const reloaded = await MailingListRepository.findById(id);
    if (!reloaded.ok) return reloaded;
    if (!reloaded.value) return err(mailingListNotFound());
    return ok(
      toMailingListWithMembersDTO(reloaded.value, reloaded.value.members),
    );
  },

  async removeMember(
    userId: string,
    slug: string,
    listId: string,
    memberId: string,
  ): Promise<Result<void>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await MailingListRepository.findById(listId);
    if (!existing.ok) return existing;
    if (!existing.value || existing.value.workspaceId !== ws.value) {
      return err(mailingListNotFound());
    }

    return MailingListRepository.removeMember(memberId);
  },
};
