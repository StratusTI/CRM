import type { MailingList, MailingListMember } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  toMailingListDTO,
  toMailingListMemberDTO,
  toMailingListWithMembersDTO,
} from "@/src/mappers/mailing-list.mapper";

const D = new Date("2026-01-01T00:00:00.000Z");

const list: MailingList = {
  id: "l1",
  name: "Leads",
  description: null,
  workspaceId: "w1",
  createdById: "u1",
  createdAt: D,
  updatedAt: D,
  deletedAt: null,
};

const member: MailingListMember = {
  id: "m1",
  mailingListId: "l1",
  email: "a@b.com",
  name: null,
  personId: null,
  createdAt: D,
};

describe("toMailingListMemberDTO", () => {
  it("serializa createdAt", () => {
    expect(toMailingListMemberDTO(member).createdAt).toBe(
      "2026-01-01T00:00:00.000Z",
    );
  });
});

describe("toMailingListDTO", () => {
  it("usa memberCount recebido", () => {
    const dto = toMailingListDTO(list, 5);
    expect(dto.memberCount).toBe(5);
    expect(dto.description).toBeNull();
  });
});

describe("toMailingListWithMembersDTO", () => {
  it("deriva memberCount do tamanho da lista", () => {
    const dto = toMailingListWithMembersDTO(list, [member]);
    expect(dto.memberCount).toBe(1);
    expect(dto.members).toHaveLength(1);
  });
});
