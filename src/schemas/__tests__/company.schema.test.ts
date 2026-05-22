import { describe, expect, it } from "vitest";
import {
  CompanyDomainSchema,
  CreateCompanySchema,
  UpdateCompanySchema,
} from "@/src/schemas/company.schema";

describe("CreateCompanySchema", () => {
  it("aceita apenas o nome (demais campos opcionais)", () => {
    const result = CreateCompanySchema.safeParse({ name: "Acme Inc" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.icp).toBe(false);
  });

  it("rejeita nome vazio", () => {
    expect(CreateCompanySchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("normaliza o domínio para minúsculas", () => {
    const result = CreateCompanySchema.safeParse({
      name: "Acme",
      domain: "ACME.com",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.domain).toBe("acme.com");
  });

  it("normaliza uma URL colada para o host puro", () => {
    const result = CreateCompanySchema.safeParse({
      name: "Acme",
      domain: "https://www.stratustelecom.com.br/sobre",
    });
    expect(result.success).toBe(true);
    if (result.success)
      expect(result.data.domain).toBe("stratustelecom.com.br");
  });

  it("rejeita domínio inválido", () => {
    expect(
      CreateCompanySchema.safeParse({ name: "Acme", domain: "not a domain" })
        .success,
    ).toBe(false);
  });

  it("rejeita employees negativo", () => {
    expect(
      CreateCompanySchema.safeParse({ name: "Acme", employees: -1 }).success,
    ).toBe(false);
  });

  it("aceita linkedin sem protocolo/www e normaliza", () => {
    const result = CreateCompanySchema.safeParse({
      name: "Acme",
      linkedin: "www.linkedin.com/company/acme",
    });
    expect(result.success).toBe(true);
    if (result.success)
      expect(result.data.linkedin).toBe("https://linkedin.com/company/acme");
  });

  it("rejeita linkedin que não é URL", () => {
    expect(
      CreateCompanySchema.safeParse({ name: "Acme", linkedin: "acme" }).success,
    ).toBe(false);
  });
});

describe("UpdateCompanySchema", () => {
  it("aceita atualização parcial de um único campo", () => {
    expect(UpdateCompanySchema.safeParse({ arr: 50000 }).success).toBe(true);
  });

  it("permite limpar campos opcionais com null", () => {
    expect(
      UpdateCompanySchema.safeParse({ accountOwnerId: null }).success,
    ).toBe(true);
  });

  it("rejeita payload vazio", () => {
    expect(UpdateCompanySchema.safeParse({}).success).toBe(false);
  });
});

describe("CompanyDomainSchema", () => {
  it("aceita subdomínios", () => {
    expect(CompanyDomainSchema.safeParse("app.acme.co.uk").success).toBe(true);
  });
});
