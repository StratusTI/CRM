import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { AddMailingListMembersSchema } from "@/src/schemas/mailing-list.schema";
import { MailingListService } from "@/src/services/mailing-list.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = { params: Promise<{ slug: string; id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const body = await request.json().catch(() => null);
  const parsed = AddMailingListMembersSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const { slug, id } = await params;
  const result = await MailingListService.addMembers(
    session.value.user.id,
    slug,
    id,
    parsed.data,
  );
  if (!result.ok) return handleError(result.error);
  return successResponse(result.value, 201);
}
