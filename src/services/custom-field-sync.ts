import type {
  CustomFieldDefinition,
  CustomFieldEntity,
  Prisma,
} from "@prisma/client";
import { customFieldInvalid } from "@/src/errors/app-error";
import { ok, type Result } from "@/src/lib/result";
import { CustomFieldRepository } from "@/src/repositories/custom-field.repository";
import {
  CustomFieldValueRepository,
  type ValueWrite,
} from "@/src/repositories/custom-field-value.repository";

/**
 * Ponte entre as entidades (Company/Person/Opportunity) e o armazenamento EAV.
 * Os valores trafegam achatados no DTO como chaves `cf_<definitionId>`.
 */

export const CUSTOM_FIELD_PREFIX = "cf_";

export type CustomFieldMap = Record<string, unknown>;

/** Coerce/valida o valor recebido conforme o tipo da definição. */
function coerceValue(
  def: CustomFieldDefinition,
  raw: unknown,
): Result<Prisma.InputJsonValue | null> {
  if (raw === null || raw === undefined || raw === "") {
    if (def.required) {
      return {
        ok: false,
        error: customFieldInvalid(`"${def.label}" é obrigatório`),
      };
    }
    return ok(null);
  }

  switch (def.type) {
    case "NUMBER": {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) {
        return {
          ok: false,
          error: customFieldInvalid(`"${def.label}" deve ser numérico`),
        };
      }
      return ok(n);
    }
    case "BOOLEAN":
      return ok(Boolean(raw));
    case "DATE": {
      const d = new Date(String(raw));
      if (Number.isNaN(d.getTime())) {
        return {
          ok: false,
          error: customFieldInvalid(`"${def.label}" tem data inválida`),
        };
      }
      return ok(d.toISOString());
    }
    case "SELECT": {
      const s = String(raw);
      if (!def.options.includes(s)) {
        return {
          ok: false,
          error: customFieldInvalid(`"${def.label}": opção inválida`),
        };
      }
      return ok(s);
    }
    default:
      return ok(String(raw));
  }
}

/**
 * Aplica os valores recebidos (mapa `definitionId → valor`) a um registro.
 * Ignora chaves que não correspondem a definições vivas da entidade.
 */
export async function applyCustomFieldValues(
  workspaceId: string,
  entity: CustomFieldEntity,
  recordId: string,
  values: CustomFieldMap,
  _userId: string,
): Promise<Result<true>> {
  const keys = Object.keys(values);
  if (keys.length === 0) return ok(true);

  const defsResult = await CustomFieldRepository.listForEntity(
    workspaceId,
    entity,
  );
  if (!defsResult.ok) return defsResult;
  const byId = new Map(defsResult.value.map((d) => [d.id, d]));

  const writes: ValueWrite[] = [];
  for (const [definitionId, raw] of Object.entries(values)) {
    const def = byId.get(definitionId);
    if (!def) continue; // definição inexistente/desativada — ignora
    const coerced = coerceValue(def, raw);
    if (!coerced.ok) return coerced;
    writes.push({ definitionId, recordId, value: coerced.value });
  }

  return CustomFieldValueRepository.applyForRecord(writes);
}

/**
 * Carrega os valores de vários registros como mapas achatados
 * `{ cf_<definitionId>: value }`, para mesclar nos DTOs.
 */
export async function loadCustomFieldMaps(
  recordIds: string[],
): Promise<Result<Map<string, CustomFieldMap>>> {
  const result = await CustomFieldValueRepository.listByRecords(recordIds);
  if (!result.ok) return result;

  const maps = new Map<string, CustomFieldMap>();
  for (const v of result.value) {
    let map = maps.get(v.recordId);
    if (!map) {
      map = {};
      maps.set(v.recordId, map);
    }
    map[`${CUSTOM_FIELD_PREFIX}${v.definitionId}`] = v.value;
  }
  return ok(maps);
}

/** Mapa achatado de um único registro (conveniência para create/getById). */
export async function loadCustomFieldMap(
  recordId: string,
): Promise<Result<CustomFieldMap>> {
  const result = await loadCustomFieldMaps([recordId]);
  if (!result.ok) return result;
  return ok(result.value.get(recordId) ?? {});
}

/**
 * Mescla um único registro com seus valores custom (achatados `cf_<id>`),
 * carregados do banco. Use em create/getById/update.
 */
export async function withCustomFields<T extends { id: string }>(
  dto: T,
): Promise<Result<T & { customFields: CustomFieldMap }>> {
  const map = await loadCustomFieldMap(dto.id);
  if (!map.ok) return map;
  return ok({ ...dto, customFields: map.value });
}

/** Mescla uma lista de DTOs com seus valores custom em batch (use em list). */
export async function withCustomFieldsList<T extends { id: string }>(
  dtos: T[],
): Promise<Result<(T & { customFields: CustomFieldMap })[]>> {
  if (dtos.length === 0) return ok([]);
  const maps = await loadCustomFieldMaps(dtos.map((d) => d.id));
  if (!maps.ok) return maps;
  return ok(
    dtos.map((d) => ({ ...d, customFields: maps.value.get(d.id) ?? {} })),
  );
}
