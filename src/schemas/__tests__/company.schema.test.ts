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

  it("aceita endereço estruturado e normaliza UF/coordenadas", () => {
    const result = CreateCompanySchema.safeParse({
      name: "Acme",
      address: {
        cep: "01310-100",
        street: "Av. Paulista",
        city: "São Paulo",
        state: "sp",
        latitude: "-23.5615",
        longitude: -46.6562,
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.address?.state).toBe("SP");
      expect(result.data.address?.latitude).toBe(-23.5615);
      expect(result.data.address?.longitude).toBe(-46.6562);
    }
  });

  it("descarta campos de endereço vazios", () => {
    const result = CreateCompanySchema.safeParse({
      name: "Acme",
      address: { cep: "01310-100", street: "", state: "" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.address?.cep).toBe("01310-100");
      expect(result.data.address?.street).toBeUndefined();
      expect(result.data.address?.state).toBeUndefined();
    }
  });

  it("aceita criação só com CNPJ (nome opcional) e armazena só dígitos", () => {
    const result = CreateCompanySchema.safeParse({
      cnpj: "11.222.333/0001-81",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cnpj).toBe("11222333000181");
      expect(result.data.name).toBeUndefined();
    }
  });

  it("rejeita CNPJ inválido", () => {
    expect(
      CreateCompanySchema.safeParse({ cnpj: "11.222.333/0001-80" }).success,
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
