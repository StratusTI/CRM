import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { UpdateNoteSchema } from "@/src/schemas/note.schema";
import { NoteService } from "@/src/services/note.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; id: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, id } = await params;
  const result = await NoteService.getById(session.value.user.id, slug, id);
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const body = await request.json().catch(() => null);
  const parsed = UpdateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const { slug, id } = await params;
  const result = await NoteService.update(
    session.value.user.id,
    slug,
    id,
    parsed.data,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, id } = await params;
  const result = await NoteService.remove(session.value.user.id, slug, id);
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
