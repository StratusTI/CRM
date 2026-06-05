import { describe, expect, it } from "vitest";
import {
  CreatedIntegrationApiKeyOutputSchema,
  CreateIntegrationApiKeySchema,
  IntegrationApiKeyOutputSchema,
} from "@/src/schemas/integration-api-key.schema";

describe("CreateIntegrationApiKeySchema", () => {
  it("aceita nome e trima", () => {
    const parsed = CreateIntegrationApiKeySchema.safeParse({ name: "  CI  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.name).toBe("CI");
  });

  it("rejeita nome vazio", () => {
    expect(CreateIntegrationApiKeySchema.safeParse({ name: " " }).success).toBe(
      false,
    );
  });
});

describe("IntegrationApiKey output schemas", () => {
  const dto = {
    id: "k_1",
    name: "CI",
    prefix: "nx_abc",
    workspaceId: "ws_1",
    createdById: "u_1",
    lastUsedAt: null,
    revokedAt: null,
    createdAt: "2026-01-01",
  };

  it("valida metadados sem token", () => {
    const parsed = IntegrationApiKeyOutputSchema.safeParse(dto);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect((parsed.data as Record<string, unknown>).token).toBeUndefined();
    }
  });

  it("a versão criada inclui token", () => {
    expect(
      CreatedIntegrationApiKeyOutputSchema.safeParse({
        ...dto,
        token: "nx_secret",
      }).success,
    ).toBe(true);
  });
});
