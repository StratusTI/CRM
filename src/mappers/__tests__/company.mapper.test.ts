import type { Company } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toCompanyDTO } from "@/src/mappers/company.mapper";

const base: Company = {
  id: "co_1",
  name: "Acme",
  domain: "acme.com",
  employees: 42,
  linkedin: "https://linkedin.com/company/acme",
  address: "Rua 1",
  arr: new Prisma.Decimal("120000.50"),
  icp: true,
  workspaceId: "ws_1",
  createdById: "user_1",
  accountOwnerId: "user_2",
  updatedById: "user_3",
  position: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  deletedAt: null,
};

describe("toCompanyDTO", () => {
  it("serializa datas em ISO e converte arr Decimal em number", () => {
    expect(toCompanyDTO(base)).toEqual({
      id: "co_1",
      name: "Acme",
      domain: "acme.com",
      employees: 42,
      linkedin: "https://linkedin.com/company/acme",
      address: "Rua 1",
      arr: 120000.5,
      icp: true,
      workspaceId: "ws_1",
      createdById: "user_1",
      accountOwnerId: "user_2",
      updatedById: "user_3",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      deletedAt: null,
    });
  });

  it("preserva nulos e serializa deletedAt quando presente", () => {
    const dto = toCompanyDTO({
      ...base,
      arr: null,
      domain: null,
      accountOwnerId: null,
      deletedAt: new Date("2026-02-01T00:00:00.000Z"),
    });
    expect(dto.arr).toBeNull();
    expect(dto.domain).toBeNull();
    expect(dto.deletedAt).toBe("2026-02-01T00:00:00.000Z");
  });
});
