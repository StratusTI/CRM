import {
  integrationKeyInvalid,
  integrationKeyNotFound,
} from "@/src/errors/app-error";
import {
  generateApiKey,
  hashApiKey,
  parseApiKeyHeader,
} from "@/src/lib/integration/api-key";
import { err, ok, type Result } from "@/src/lib/result";
import { toIntegrationApiKeyDTO } from "@/src/mappers/integration-api-key.mapper";
import { IntegrationApiKeyRepository } from "@/src/repositories/integration-api-key.repository";
import type {
  CreatedIntegrationApiKeyDTO,
  CreateIntegrationApiKeyInput,
  IntegrationApiKeyDTO,
} from "@/src/schemas/integration-api-key.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

/** Contexto resolvido a partir de uma chave de API válida. */
export type IntegrationContext = {
  keyId: string;
  workspaceId: string;
  /** Usuário que gerou a chave — vira o autor dos registros ingeridos. */
  actorUserId: string;
};

export const IntegrationApiKeyService = {
  /** Gera uma chave para a workspace (exige sessão de membro). */
  async create(
    userId: string,
    slug: string,
    input: CreateIntegrationApiKeyInput,
  ): Promise<Result<CreatedIntegrationApiKeyDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const { token, hash, prefix } = generateApiKey();
    const created = await IntegrationApiKeyRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      name: input.name,
      keyHash: hash,
      prefix,
    });
    if (!created.ok) return created;

    return ok({ ...toIntegrationApiKeyDTO(created.value), token });
  },

  /** Lista as chaves da workspace (sem segredos). */
  async list(
    userId: string,
    slug: string,
  ): Promise<Result<IntegrationApiKeyDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const keys = await IntegrationApiKeyRepository.listByWorkspace(ws.value);
    if (!keys.ok) return keys;
    return ok(keys.value.map(toIntegrationApiKeyDTO));
  },

  /** Revoga uma chave da workspace. */
  async revoke(
    userId: string,
    slug: string,
    keyId: string,
  ): Promise<Result<IntegrationApiKeyDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const found = await IntegrationApiKeyRepository.findById(keyId);
    if (!found.ok) return found;
    if (!found.value || found.value.workspaceId !== ws.value) {
      return err(integrationKeyNotFound());
    }

    const revoked = await IntegrationApiKeyRepository.revoke(keyId);
    if (!revoked.ok) return revoked;
    return ok(toIntegrationApiKeyDTO(revoked.value));
  },

  /**
   * Autentica uma requisição server-to-server pelo header Authorization.
   * Resolve o contexto (workspace + autor) ou retorna INTEGRATION_KEY_INVALID.
   */
  async authenticate(
    authorizationHeader: string | null,
  ): Promise<Result<IntegrationContext>> {
    const token = parseApiKeyHeader(authorizationHeader);
    if (!token) return err(integrationKeyInvalid());

    const found = await IntegrationApiKeyRepository.findActiveByHash(
      hashApiKey(token),
    );
    if (!found.ok) return found;
    if (!found.value) return err(integrationKeyInvalid());

    await IntegrationApiKeyRepository.touchLastUsed(found.value.id);

    return ok({
      keyId: found.value.id,
      workspaceId: found.value.workspaceId,
      actorUserId: found.value.createdById,
    });
  },
};
