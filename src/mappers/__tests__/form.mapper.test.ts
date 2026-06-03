import type { Form } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toFormDTO, toPublicFormDTO } from "@/src/mappers/form.mapper";

function buildForm(overrides: Partial<Form> = {}): Form {
  return {
    id: "form_1",
    name: "Contato",
    description: "Fale conosco",
    status: "PUBLISHED",
    publicToken: "tok_abc",
    action: "LEAD",
    fields: [
      {
        key: "nome",
        label: "Nome",
        type: "text",
        required: true,
        mapping: { target: "person", attribute: "name" },
      },
    ],
    actionConfig: { opportunitySource: "FORM" },
    successMessage: "Obrigado!",
    redirectUrl: null,
    submissionCount: 3,
    workspaceId: "ws_1",
    createdById: "user_1",
    updatedById: null,
    position: 0,
    publishedAt: new Date("2026-06-01T12:00:00.000Z"),
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    updatedAt: new Date("2026-06-02T10:00:00.000Z"),
    deletedAt: null,
    ...overrides,
  } as Form;
}

describe("toFormDTO", () => {
  it("converte datas para ISO e computa publicUrl", () => {
    const dto = toFormDTO(buildForm());
    expect(dto.createdAt).toBe("2026-06-01T10:00:00.000Z");
    expect(dto.publishedAt).toBe("2026-06-01T12:00:00.000Z");
    expect(dto.deletedAt).toBeNull();
    // NEXT_PUBLIC_URL é fixado em http://localhost:3000 no ambiente de teste.
    expect(dto.publicUrl).toBe("http://localhost:3000/f/tok_abc");
    expect(dto.fields).toHaveLength(1);
    expect(dto.actionConfig.opportunitySource).toBe("FORM");
  });
});

describe("toPublicFormDTO", () => {
  it("expõe só os campos públicos, sem o mapping", () => {
    const dto = toPublicFormDTO(buildForm());
    expect(dto.name).toBe("Contato");
    expect(dto.fields[0]).toMatchObject({
      key: "nome",
      label: "Nome",
      type: "text",
      required: true,
    });
    expect(
      (dto.fields[0] as unknown as { mapping?: unknown }).mapping,
    ).toBeUndefined();
    expect(
      (dto as unknown as { publicToken?: string }).publicToken,
    ).toBeUndefined();
  });
});
