import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const fieldRepo = vi.hoisted(() => ({ listForEntity: vi.fn() }));
const valueRepo = vi.hoisted(() => ({
  applyForRecord: vi.fn(),
  listByRecords: vi.fn(),
}));

vi.mock("@/src/repositories/custom-field.repository", () => ({
  CustomFieldRepository: fieldRepo,
}));
vi.mock("@/src/repositories/custom-field-value.repository", () => ({
  CustomFieldValueRepository: valueRepo,
}));

import {
  applyCustomFieldValues,
  CUSTOM_FIELD_PREFIX,
  loadCustomFieldMap,
} from "@/src/services/custom-field-sync";

function def(overrides: Record<string, unknown>) {
  return {
    id: "d1",
    workspaceId: "ws_1",
    entity: "COMPANY",
    key: "k",
    label: "Campo",
    type: "TEXT",
    options: [] as string[],
    required: false,
    position: 1,
    ...overrides,
  };
}

beforeEach(() => {
  fieldRepo.listForEntity.mockReset();
  valueRepo.applyForRecord.mockReset().mockResolvedValue(ok(true));
  valueRepo.listByRecords.mockReset();
});

describe("applyCustomFieldValues", () => {
  it("coage NUMBER e grava como número", async () => {
    fieldRepo.listForEntity.mockResolvedValue(
      ok([def({ id: "d1", type: "NUMBER" })]),
    );
    const r = await applyCustomFieldValues(
      "ws_1",
      "COMPANY",
      "rec_1",
      { d1: "42" },
      "u1",
    );
    expect(r.ok).toBe(true);
    const writes = valueRepo.applyForRecord.mock.calls[0][0];
    expect(writes[0].value).toBe(42);
  });

  it("rejeita opção inválida de SELECT", async () => {
    fieldRepo.listForEntity.mockResolvedValue(
      ok([def({ id: "d1", type: "SELECT", options: ["A", "B"] })]),
    );
    const r = await applyCustomFieldValues(
      "ws_1",
      "COMPANY",
      "rec_1",
      { d1: "C" },
      "u1",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("CUSTOM_FIELD_INVALID");
    expect(valueRepo.applyForRecord).not.toHaveBeenCalled();
  });

  it("rejeita obrigatório vazio", async () => {
    fieldRepo.listForEntity.mockResolvedValue(
      ok([def({ id: "d1", required: true })]),
    );
    const r = await applyCustomFieldValues(
      "ws_1",
      "COMPANY",
      "rec_1",
      { d1: "" },
      "u1",
    );
    expect(r.ok).toBe(false);
  });

  it("envia null para remover quando vazio e não-obrigatório", async () => {
    fieldRepo.listForEntity.mockResolvedValue(ok([def({ id: "d1" })]));
    await applyCustomFieldValues("ws_1", "COMPANY", "rec_1", { d1: "" }, "u1");
    const writes = valueRepo.applyForRecord.mock.calls[0][0];
    expect(writes[0].value).toBeNull();
  });

  it("ignora ids sem definição correspondente", async () => {
    fieldRepo.listForEntity.mockResolvedValue(ok([def({ id: "d1" })]));
    await applyCustomFieldValues(
      "ws_1",
      "COMPANY",
      "rec_1",
      { desconhecido: "x" },
      "u1",
    );
    const writes = valueRepo.applyForRecord.mock.calls[0][0];
    expect(writes).toHaveLength(0);
  });
});

describe("loadCustomFieldMap", () => {
  it("achata os valores como cf_<definitionId>", async () => {
    valueRepo.listByRecords.mockResolvedValue(
      ok([{ recordId: "rec_1", definitionId: "d1", value: "Enterprise" }]),
    );
    const r = await loadCustomFieldMap("rec_1");
    expect(r.ok && r.value[`${CUSTOM_FIELD_PREFIX}d1`]).toBe("Enterprise");
  });
});
