import type { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { RescheduleInputSchema } from "@/src/schemas/scheduled-post.schema";
import { ScheduledPostService } from "@/src/services/scheduled-post.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = { params: Promise<{ slug: string; id: string }> };

/** Detalhe de um post agendado. */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, id } = await params;
  const result = await ScheduledPostService.getById(
    session.value.user.id,
    slug,
    id,
  );
  if (!result.ok) return handleError(result.error);
  return successResponse(result.value);
}

/** Reagenda um post (nova data/hora). Corpo JSON: `{ scheduledFor }`. */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return handleError(badRequest("Corpo JSON inválido"));
  }
  const parsed = RescheduleInputSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const result = await ScheduledPostService.reschedule(
    session.value.user.id,
    slug,
    id,
    new Date(parsed.data.scheduledFor),
  );
  if (!result.ok) return handleError(result.error);
  return successResponse(result.value);
}

/** Cancela um post agendado. */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, id } = await params;
  const result = await ScheduledPostService.cancel(
    session.value.user.id,
    slug,
    id,
  );
  if (!result.ok) return handleError(result.error);
  return successResponse(result.value);
}
