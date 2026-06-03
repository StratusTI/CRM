/**
 * Consulta de CEP (client-side). Usa o ViaCEP para o endereço e, como
 * enriquecimento opcional e best-effort, a BrasilAPI (v2) para coordenadas
 * geográficas — que o ViaCEP não fornece.
 */

export type CepLookup = {
  cep: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
};

/** Mantém apenas os dígitos do CEP. */
export function normalizeCep(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}

/** Formata o CEP como `00000-000` (parcial enquanto digita). */
export function formatCep(value: string): string {
  const digits = normalizeCep(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/** `true` quando o CEP tem os 8 dígitos. */
export function isCompleteCep(value: string): boolean {
  return normalizeCep(value).length === 8;
}

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
};

type BrasilApiResponse = {
  location?: {
    coordinates?: {
      latitude?: number | string;
      longitude?: number | string;
    };
  };
};

/** Busca as coordenadas na BrasilAPI; nunca lança (best-effort). */
async function fetchCoordinates(
  cep: string,
  signal?: AbortSignal,
): Promise<{ latitude?: number; longitude?: number }> {
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, {
      signal,
    });
    if (!res.ok) return {};
    const data = (await res.json()) as BrasilApiResponse;
    const coords = data.location?.coordinates;
    if (!coords) return {};
    const latitude = coords.latitude != null ? Number(coords.latitude) : NaN;
    const longitude = coords.longitude != null ? Number(coords.longitude) : NaN;
    return {
      ...(Number.isFinite(latitude) ? { latitude } : {}),
      ...(Number.isFinite(longitude) ? { longitude } : {}),
    };
  } catch {
    return {};
  }
}

export class CepNotFoundError extends Error {
  constructor() {
    super("CEP não encontrado");
    this.name = "CepNotFoundError";
  }
}

/**
 * Resolve um CEP em endereço. Lança `CepNotFoundError` quando o CEP não
 * existe e `Error` genérico em falha de rede.
 */
export async function lookupCep(
  rawCep: string,
  signal?: AbortSignal,
): Promise<CepLookup> {
  const cep = normalizeCep(rawCep);
  if (cep.length !== 8) throw new CepNotFoundError();

  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal });
  if (!res.ok) throw new Error("Falha ao consultar o CEP");

  const data = (await res.json()) as ViaCepResponse;
  if (data.erro) throw new CepNotFoundError();

  const coords = await fetchCoordinates(cep, signal);

  return {
    cep: formatCep(cep),
    street: data.logradouro || undefined,
    neighborhood: data.bairro || undefined,
    city: data.localidade || undefined,
    state: data.uf || undefined,
    ...coords,
  };
}
