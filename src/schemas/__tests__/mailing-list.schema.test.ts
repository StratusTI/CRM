import { describe, expect, it } from "vitest";
import {
  AddMailingListMembersSchema,
  CreateMailingListSchema,
  MailingListOutputSchema,
  MailingListWithMembersSchema,
  UpdateMailingListSchema,
} from "@/src/schemas/mailing-list.schema";

describe("CreateMailingListSchema", () => {
  it("aceita nome e trima", () => {
    const parsed = CreateMailingListSchema.safeParse({ name: "  Leads  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.name).toBe("Leads");
  });

  it("rejeita nome vazio", () => {
    expect(CreateMailingListSchema.safeParse({ name: " " }).success).toBe(
      false,
    );
  });
});

describe("UpdateMailingListSchema", () => {
  it("aceita atualização parcial", () => {
    expect(
      UpdateMailingListSchema.safeParse({ description: "x" }).success,
    ).toBe(true);
  });
});

describe("AddMailingListMembersSchema", () => {
  it("aceita membros válidos", () => {
    const parsed = AddMailingListMembersSchema.safeParse({
      members: [{ email: "a@b.com", name: "A", personId: "p_1" }],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejeita lista vazia", () => {
    expect(AddMailingListMembersSchema.safeParse({ members: [] }).success).toBe(
      false,
    );
  });

  it("rejeita email inválido", () => {
    expect(
      AddMailingListMembersSchema.safeParse({
        members: [{ email: "x" }],
      }).success,
    ).toBe(false);
  });
});

describe("MailingList output schemas", () => {
  const dto = {
    id: "l_1",
    name: "Leads",
    description: null,
    memberCount: 2,
    workspaceId: "ws_1",
    createdById: "u_1",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };

  it("valida DTO da lista", () => {
    expect(MailingListOutputSchema.safeParse(dto).success).toBe(true);
  });

  it("valida lista com membros", () => {
    expect(
      MailingListWithMembersSchema.safeParse({
        ...dto,
        members: [
          {
            id: "m_1",
            mailingListId: "l_1",
            email: "a@b.com",
            name: null,
            personId: null,
            createdAt: "2026-01-01",
          },
        ],
      }).success,
    ).toBe(true);
  });
});
