import { beforeEach, describe, expect, it, vi } from "vitest";
import { companyNotFound, databaseError } from "@/src/errors/app-error";
import { err, ok } from "@/src/lib/result";

const personRepo = vi.hoisted(() => ({ create: vi.fn() }));
const companyRepo = vi.hoisted(() => ({ existsInWorkspace: vi.fn() }));

vi.mock("@/src/repositories/person.repository", () => ({
  PersonRepository: personRepo,
}));
vi.mock("@/src/repositories/company.repository", () => ({
  CompanyRepository: companyRepo,
}));

import { PersonIngestService } from "@/src/services/person-ingest.service";

const WS = "ws_1";

beforeEach(() => {
  personRepo.create.mockReset();
  companyRepo.existsInWorkspace.mockReset();
});

describe("PersonIngestService.ingest", () => {
  it("cria todas as pessoas válidas e relata o total", async () => {
    personRepo.create
      .mockResolvedValueOnce(ok({ id: "p_1" }))
      .mockResolvedValueOnce(ok({ id: "p_2" }));
    const result = await PersonIngestService.ingest(WS, "user_1", [
      { name: "Ana", emails: [], phones: [] },
      { name: "Beto", emails: [], phones: [] },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({ total: 2, created: 2, failed: 0 });
      expect(result.value.results[0]).toMatchObject({
        index: 0,
        status: "created",
        id: "p_1",
      });
    }
  });

  it("isola falhas: uma pessoa falha, as demais seguem", async () => {
    personRepo.create
      .mockResolvedValueOnce(err(databaseError()))
      .mockResolvedValueOnce(ok({ id: "p_2" }));
    const result = await PersonIngestService.ingest(WS, "user_1", [
      { name: "Ana", emails: [], phones: [] },
      { name: "Beto", emails: [], phones: [] },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({ total: 2, created: 1, failed: 1 });
      expect(result.value.results[0].status).toBe("failed");
    }
  });

  it("valida a empresa referenciada antes de criar", async () => {
    companyRepo.existsInWorkspace.mockResolvedValue(ok(false));
    const result = await PersonIngestService.ingest(WS, "user_1", [
      { name: "Ana", emails: [], phones: [], companyId: "co_x" },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.failed).toBe(1);
      const r = result.value.results[0];
      expect(r.status).toBe("failed");
      if (r.status === "failed") {
        expect(r.error.code).toBe(companyNotFound().code);
      }
    }
    expect(personRepo.create).not.toHaveBeenCalled();
  });

  it("cria a pessoa quando a empresa existe", async () => {
    companyRepo.existsInWorkspace.mockResolvedValue(ok(true));
    personRepo.create.mockResolvedValue(ok({ id: "p_1" }));
    const result = await PersonIngestService.ingest(WS, "user_1", [
      { name: "Ana", emails: [], phones: [], companyId: "co_1" },
    ]);
    expect(result.ok && result.value.created).toBe(1);
    expect(companyRepo.existsInWorkspace).toHaveBeenCalledWith("co_1", WS);
    expect(personRepo.create.mock.calls[0][0].companyId).toBe("co_1");
  });

  it("lote vazio retorna relatório zerado", async () => {
    const result = await PersonIngestService.ingest(WS, "user_1", []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({ total: 0, created: 0, failed: 0 });
    }
  });
});
