import type { NextRequest } from "next/server";
import { getAuthSession } from "@/src/lib/auth-session";
import { LeadService } from "@/src/services/lead.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; id: string }>;
};

/** Converte o lead em Pessoa + Oportunidade (manual). */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, id } = await params;
  const result = await LeadService.convert(session.value.user.id, slug, id);
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
