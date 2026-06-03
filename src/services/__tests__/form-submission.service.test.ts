import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";
import type { FormFieldDef } from "@/src/schemas/form.schema";

const formRepo = vi.hoisted(() => ({
  findByPublicToken: vi.fn(),
  recordSubmission: vi.fn(),
}));
const personRepo = vi.hoisted(() => ({
  findByEmailOrPhone: vi.fn(),
  create: vi.fn(),
}));
const companyRepo = vi.hoisted(() => ({
  findByDomain: vi.fn(),
  findByCnpj: vi.fn(),
  create: vi.fn(),
}));
const leadIngest = vi.hoisted(() => ({ ingest: vi.fn() }));
const dispatch = vi.hoisted(() => vi.fn());

vi.mock("@/src/repositories/form.repository", () => ({
  FormRepository: formRepo,
}));
vi.mock("@/src/repositories/person.repository", () => ({
  PersonRepository: personRepo,
}));
vi.mock("@/src/repositories/company.repository", () => ({
  CompanyRepository: companyRepo,
}));
vi.mock("@/src/services/lead-ingest.service", () => ({
  LeadIngestService: leadIngest,
}));
vi.mock("@/src/services/workflow-dispatcher", () => ({
  dispatchRecordEvent: dispatch,
}));
vi.mock("@/src/mappers/person.mapper", () => ({
  toPersonDTO: (p: unknown) => p,
}));
vi.mock("@/src/mappers/company.mapper", () => ({
  toCompanyDTO: (c: unknown) => c,
}));

import { FormSubmissionService } from "@/src/services/form-submission.service";

const CTX = { ip: "1.2.3.4", referrer: null };

const nameField: FormFieldDef = {
  key: "nome",
  label: "Nome",
  type: "text",
  required: true,
  mapping: { target: "person", attribute: "name" },
};
const emailField: FormFieldDef = {
  key: "email",
  label: "E-mail",
  type: "email",
  required: false,
  mapping: { target: "person", attribute: "email" },
};

function form(overrides: Record<string, unknown> = {}) {
  return {
    id: "form_1",
    status: "PUBLISHED",
    action: "LEAD",
    fields: [nameField, emailField],
    actionConfig: {},
    workspaceId: "ws_1",
    createdById: "actor_1",
    redirectUrl: null,
    successMessage: "Obrigado!",
    ...overrides,
  };
}

beforeEach(() => {
  for (const m of [formRepo, personRepo, companyRepo, leadIngest]) {
    for (const fn of Object.values(m))
      (fn as ReturnType<typeof vi.fn>).mockReset();
  }
  dispatch.mockReset();
  formRepo.recordSubmission.mockResolvedValue(ok({ id: "sub_1" }));
});

describe("FormSubmissionService.submit", () => {
  it("rejeita formulário não publicado", async () => {
    formRepo.findByPublicToken.mockResolvedValue(ok(form({ status: "DRAFT" })));
    const res = await FormSubmissionService.submit("tok", { values: {} }, CTX);
    expect(res.ok).toBe(false);
    expect(formRepo.recordSubmission).not.toHaveBeenCalled();
  });

  it("honeypot preenchido retorna sucesso sem gravar", async () => {
    formRepo.findByPublicToken.mockResolvedValue(ok(form()));
    const res = await FormSubmissionService.submit(
      "tok",
      { values: { nome: "Bot" }, _hp: "spam" },
      CTX,
    );
    expect(res.ok).toBe(true);
    expect(formRepo.recordSubmission).not.toHaveBeenCalled();
    expect(leadIngest.ingest).not.toHaveBeenCalled();
  });

  it("rejeita valores inválidos (obrigatório vazio)", async () => {
    formRepo.findByPublicToken.mockResolvedValue(ok(form()));
    const res = await FormSubmissionService.submit(
      "tok",
      { values: { nome: "" } },
      CTX,
    );
    expect(res.ok).toBe(false);
    expect(leadIngest.ingest).not.toHaveBeenCalled();
  });

  it("LEAD: chama LeadIngestService e registra os ids criados", async () => {
    formRepo.findByPublicToken.mockResolvedValue(ok(form()));
    leadIngest.ingest.mockResolvedValue(
      ok({
        personReused: false,
        person: { id: "p_1" },
        opportunity: { id: "o_1" },
      }),
    );

    const res = await FormSubmissionService.submit(
      "tok",
      { values: { nome: "Ada", email: "ada@x.com" } },
      CTX,
    );

    expect(res.ok).toBe(true);
    expect(leadIngest.ingest).toHaveBeenCalledTimes(1);
    const [wsId, actor, input] = leadIngest.ingest.mock.calls[0];
    expect(wsId).toBe("ws_1");
    expect(actor).toBe("actor_1");
    expect(input.person.name).toBe("Ada");
    expect(input.person.emails).toEqual(["ada@x.com"]);

    expect(formRepo.recordSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: "form_1",
        createdPersonId: "p_1",
        createdOpportunityId: "o_1",
        personReused: false,
      }),
    );
  });

  it("PERSON: reutiliza pessoa existente por e-mail/telefone", async () => {
    formRepo.findByPublicToken.mockResolvedValue(
      ok(form({ action: "PERSON" })),
    );
    personRepo.findByEmailOrPhone.mockResolvedValue(ok({ id: "p_existing" }));

    const res = await FormSubmissionService.submit(
      "tok",
      { values: { nome: "Ada", email: "ada@x.com" } },
      CTX,
    );

    expect(res.ok).toBe(true);
    expect(personRepo.create).not.toHaveBeenCalled();
    expect(formRepo.recordSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        createdPersonId: "p_existing",
        personReused: true,
      }),
    );
  });

  it("COMPANY: reutiliza empresa existente por domínio", async () => {
    const domainField: FormFieldDef = {
      key: "site",
      label: "Site",
      type: "url",
      required: false,
      mapping: { target: "company", attribute: "domain" },
    };
    const companyNameField: FormFieldDef = {
      ...nameField,
      mapping: { target: "company", attribute: "name" },
    };
    formRepo.findByPublicToken.mockResolvedValue(
      ok(form({ action: "COMPANY", fields: [companyNameField, domainField] })),
    );
    companyRepo.findByDomain.mockResolvedValue(ok({ id: "c_existing" }));

    const res = await FormSubmissionService.submit(
      "tok",
      { values: { nome: "Acme", site: "acme.com" } },
      CTX,
    );

    expect(res.ok).toBe(true);
    // Campo URL "acme.com" vira "https://acme.com" na validação e é
    // normalizado para o host puro antes do dedupe por domínio.
    expect(companyRepo.findByDomain).toHaveBeenCalledWith("ws_1", "acme.com");
    expect(companyRepo.create).not.toHaveBeenCalled();
    expect(formRepo.recordSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ createdCompanyId: "c_existing" }),
    );
  });
});
