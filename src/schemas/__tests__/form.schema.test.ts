import { describe, expect, it } from "vitest";
import {
  buildSubmissionSchema,
  CreateFormSchema,
  type FormFieldDef,
  FormFieldsSchema,
  validateFieldsForAction,
} from "@/src/schemas/form.schema";

function field(overrides: Partial<FormFieldDef> = {}): FormFieldDef {
  return {
    key: "nome",
    label: "Nome",
    type: "text",
    required: false,
    mapping: { target: "person", attribute: "name" },
    ...overrides,
  } as FormFieldDef;
}

describe("FormFieldsSchema", () => {
  it("rejeita chaves duplicadas", () => {
    const result = FormFieldsSchema.safeParse([
      field({ key: "nome" }),
      field({ key: "nome", label: "Outro" }),
    ]);
    expect(result.success).toBe(false);
  });

  it("exige opções em campos de seleção", () => {
    const result = FormFieldsSchema.safeParse([
      field({ key: "origem", type: "select", options: [] }),
    ]);
    expect(result.success).toBe(false);
  });

  it("aceita campo de seleção com opções", () => {
    const result = FormFieldsSchema.safeParse([
      field({
        key: "origem",
        type: "select",
        mapping: { target: "person", attribute: "city" },
        options: [{ label: "Site", value: "site" }],
      }),
    ]);
    expect(result.success).toBe(true);
  });

  it("rejeita chave com formato inválido", () => {
    const result = FormFieldsSchema.safeParse([
      field({ key: "Nome Inválido" }),
    ]);
    expect(result.success).toBe(false);
  });

  it("rejeita atributo fora da allowlist do destino", () => {
    const result = FormFieldsSchema.safeParse([
      field({ mapping: { target: "person", attribute: "ssn" } }),
    ]);
    expect(result.success).toBe(false);
  });
});

describe("validateFieldsForAction", () => {
  it("rejeita destino incompatível com a ação (COMPANY com campo de pessoa)", () => {
    const msg = validateFieldsForAction(
      "COMPANY",
      [field({ mapping: { target: "person", attribute: "name" } })],
      false,
    );
    expect(msg).not.toBeNull();
  });

  it("permite rascunho incompleto quando requireComplete=false", () => {
    const msg = validateFieldsForAction(
      "LEAD",
      [field({ required: false })],
      false,
    );
    expect(msg).toBeNull();
  });

  it("exige nome obrigatório ao publicar PERSON", () => {
    const incomplete = validateFieldsForAction(
      "PERSON",
      [field({ required: false })],
      true,
    );
    expect(incomplete).not.toBeNull();

    const complete = validateFieldsForAction(
      "PERSON",
      [field({ required: true })],
      true,
    );
    expect(complete).toBeNull();
  });

  it("exige nome obrigatório + email/telefone ao publicar LEAD", () => {
    const onlyName = validateFieldsForAction(
      "LEAD",
      [field({ required: true })],
      true,
    );
    expect(onlyName).not.toBeNull();

    const withEmail = validateFieldsForAction(
      "LEAD",
      [
        field({ key: "nome", required: true }),
        field({
          key: "email",
          type: "email",
          mapping: { target: "person", attribute: "email" },
        }),
      ],
      true,
    );
    expect(withEmail).toBeNull();
  });
});

describe("buildSubmissionSchema", () => {
  it("rejeita campo obrigatório vazio e valida e-mail", () => {
    const schema = buildSubmissionSchema([
      field({ key: "nome", required: true }),
      field({
        key: "email",
        type: "email",
        required: true,
        mapping: { target: "person", attribute: "email" },
      }),
    ]);

    expect(schema.safeParse({ nome: "", email: "ada@x.com" }).success).toBe(
      false,
    );
    expect(schema.safeParse({ nome: "Ada", email: "não-email" }).success).toBe(
      false,
    );
    expect(schema.safeParse({ nome: "Ada", email: "ada@x.com" }).success).toBe(
      true,
    );
  });

  it("aceita campos opcionais enviados em branco (e-mail/número vazios)", () => {
    const schema = buildSubmissionSchema([
      field({
        key: "email",
        type: "email",
        required: false,
        mapping: { target: "person", attribute: "email" },
      }),
      field({
        key: "func",
        type: "number",
        required: false,
        mapping: { target: "company", attribute: "employees" },
      }),
    ]);
    expect(schema.safeParse({ email: "", func: "" }).success).toBe(true);
  });

  it("torna campos não obrigatórios opcionais e coage números", () => {
    const schema = buildSubmissionSchema([
      field({
        key: "func",
        type: "number",
        required: false,
        mapping: { target: "company", attribute: "employees" },
      }),
    ]);
    expect(schema.safeParse({}).success).toBe(true);
    const parsed = schema.safeParse({ func: "120" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.func).toBe(120);
  });
});

describe("CreateFormSchema", () => {
  it("aplica defaults (action=LEAD, fields=[])", () => {
    const parsed = CreateFormSchema.safeParse({ name: "Contato" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.action).toBe("LEAD");
      expect(parsed.data.fields).toEqual([]);
    }
  });

  it("exige nome", () => {
    expect(CreateFormSchema.safeParse({ name: "" }).success).toBe(false);
  });
});
