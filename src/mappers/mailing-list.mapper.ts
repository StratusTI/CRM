import type { MailingList, MailingListMember } from "@prisma/client";
import type {
  MailingListDTO,
  MailingListMemberDTO,
  MailingListWithMembersDTO,
} from "@/src/schemas/mailing-list.schema";

export function toMailingListMemberDTO(
  m: MailingListMember,
): MailingListMemberDTO {
  return {
    id: m.id,
    mailingListId: m.mailingListId,
    email: m.email,
    name: m.name,
    personId: m.personId,
    createdAt: m.createdAt.toISOString(),
  };
}

export function toMailingListDTO(
  list: MailingList,
  memberCount: number,
): MailingListDTO {
  return {
    id: list.id,
    name: list.name,
    description: list.description,
    memberCount,
    workspaceId: list.workspaceId,
    createdById: list.createdById,
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
  };
}

export function toMailingListWithMembersDTO(
  list: MailingList,
  members: MailingListMember[],
): MailingListWithMembersDTO {
  return {
    ...toMailingListDTO(list, members.length),
    members: members.map(toMailingListMemberDTO),
  };
}
