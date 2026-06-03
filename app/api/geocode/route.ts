import type { NextRequest } from "next/server";
import { successResponse } from "@/utils/http-response";

/**
 * Geocodificação best-effort via Nominatim (OpenStreetMap). Existe como rota
 * interna por dois motivos: a policy do Nominatim exige um `User-Agent` que
 * identifique a aplicação (o browser não permite defini-lo) e assim evitamos
 * CORS/rate-limit no cliente. Nunca lança — devolve `{}` quando não resolve.
 */

type NominatimResult = { lat?: string; lon?: string };
type Coordinates = { latitude?: number; longitude?: number };

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "StratusCRM/1.0 (+geocoding de CEP)";

/** Consulta o Nominatim com os parâmetros dados. Devolve `{}` se não resolver. */
async function query(params: URLSearchParams): Promise<Coordinates> {
  params.set("format", "jsonv2");
  params.set("limit", "1");
  params.set("countrycodes", "br");

  const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "pt-BR" },
    // Mesmo CEP/endereço sempre resolve igual; cacheamos por 1 dia.
    next: { revalidate: 86_400 },
  });
  if (!res.ok) return {};

  const hit = ((await res.json()) as NominatimResult[])[0];
  if (!hit) return {};

  const latitude = hit.lat != null ? Number(hit.lat) : NaN;
  const longitude = hit.lon != null ? Number(hit.lon) : NaN;
  return {
    ...(Number.isFinite(latitude) ? { latitude } : {}),
    ...(Number.isFinite(longitude) ? { longitude } : {}),
  };
}

function hasCoords(c: Coordinates): boolean {
  return c.latitude != null && c.longitude != null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const street = searchParams.get("street")?.trim();
  const city = searchParams.get("city")?.trim();
  const state = searchParams.get("state")?.trim();
  const cep = searchParams.get("cep")?.replace(/\D/g, "");

  // Sem nenhum critério não há o que geocodificar.
  if (!street && !city && !cep) return successResponse({});

  try {
    // 1) Busca estruturada: mais precisa quando o logradouro existe no OSM.
    const structured = new URLSearchParams();
    if (street) structured.set("street", street);
    if (city) structured.set("city", city);
    if (state) structured.set("state", state);
    if (cep) structured.set("postalcode", cep);

    let coords = await query(structured);

    // 2) Fallback por texto livre: cobre CEPs que a busca estruturada não acha.
    if (!hasCoords(coords)) {
      const q = [street, city, state, "Brasil"].filter(Boolean).join(", ");
      coords = await query(new URLSearchParams({ q }));
    }

    return successResponse(coords);
  } catch {
    return successResponse({});
  }
}
