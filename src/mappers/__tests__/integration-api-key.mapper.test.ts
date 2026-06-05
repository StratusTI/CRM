import type { IntegrationApiKey } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toIntegrationApiKeyDTO } from "@/src/mappers/integration-api-key.mapper";

const D = new Date("2026-01-01T00:00:00.000Z");

const key: IntegrationApiKey = {
  id: "k1",
  name: "CI",
  keyHash: "hash",
  prefix: "nx_abc",
  workspaceId: "w1",
  createdById: "u1",
  lastUsedAt: null,
  revokedAt: null,
  createdAt: D,
} as IntegrationApiKey;

describe("toIntegrationApiKeyDTO", () => {
  it("não expõe o hash do segredo", () => {
    const dto = toIntegrationApiKeyDTO(key);
    expect(dto).not.toHaveProperty("keyHash");
    expect(dto.lastUsedAt).toBeNull();
    expect(dto.revokedAt).toBeNull();
  });

  it("serializa lastUsedAt/revokedAt quando presentes", () => {
    const dto = toIntegrationApiKeyDTO({
      ...key,
      lastUsedAt: D,
      revokedAt: D,
    });
    expect(dto.lastUsedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(dto.revokedAt).toBe("2026-01-01T00:00:00.000Z");
  });
});
