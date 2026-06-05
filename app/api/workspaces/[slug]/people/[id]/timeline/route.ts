import type { NextRequest } from "next/server";
import { getAuthSession } from "@/src/lib/auth-session";
import { ActivityService } from "@/src/services/activity.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; id: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, id } = await params;
  const result = await ActivityService.timelineFor(
    session.value.user.id,
    slug,
    "person",
    id,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
