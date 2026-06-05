import type { QuotaPeriod } from "@prisma/client";
import type { NextRequest } from "next/server";
import { getAuthSession } from "@/src/lib/auth-session";
import { ForecastService } from "@/src/services/forecast.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const raw = request.nextUrl.searchParams.get("period");
  const period: QuotaPeriod = raw === "QUARTER" ? "QUARTER" : "MONTH";

  const { slug } = await params;
  const result = await ForecastService.getForecast(
    session.value.user.id,
    slug,
    period,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
