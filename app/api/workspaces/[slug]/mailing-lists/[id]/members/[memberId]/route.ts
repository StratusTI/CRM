import type { NextRequest } from "next/server";
import { getAuthSession } from "@/src/lib/auth-session";
import { MailingListService } from "@/src/services/mailing-list.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; id: string; memberId: string }>;
};

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, id, memberId } = await params;
  const result = await MailingListService.removeMember(
    session.value.user.id,
    slug,
    id,
    memberId,
  );
  if (!result.ok) return handleError(result.error);
  return successResponse(null, 204);
}
