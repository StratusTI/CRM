import type { NextRequest } from "next/server";
import { getOpenAiModel } from "@/src/lib/ai/env";
import { getAuthSession } from "@/src/lib/auth-session";
import { AiUsageRepository } from "@/src/repositories/ai-usage.repository";
import { MembershipRepository } from "@/src/repositories/membership.repository";
import { handleError, successResponse } from "@/utils/http-response";

// Preços GPT-4o (USD por token)
const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5 / 1_000_000, output: 10 / 1_000_000 },
  "gpt-4o-mini": { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
  "gpt-4-turbo": { input: 10 / 1_000_000, output: 30 / 1_000_000 },
  "gpt-3.5-turbo": { input: 0.5 / 1_000_000, output: 1.5 / 1_000_000 },
};

function getPricing(model: string) {
  return PRICING[model] ?? PRICING["gpt-4o"];
}

function calcCost(inputTokens: number, outputTokens: number, model: string) {
  const p = getPricing(model);
  return inputTokens * p.input + outputTokens * p.output;
}

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug } = await params;
  const membership = await MembershipRepository.findByUserAndSlug(
    session.value.user.id,
    slug,
  );
  if (!membership.ok) return handleError(membership.error);
  if (!membership.value) {
    return handleError({
      code: "NOT_FOUND",
      message: "Workspace não encontrado",
    } as never);
  }

  const summary = await AiUsageRepository.getSummary(
    membership.value.workspace.id,
  );
  if (!summary.ok) return handleError(summary.error);

  const model = getOpenAiModel();
  const {
    totalInputTokens,
    totalOutputTokens,
    currentMonthInputTokens,
    currentMonthOutputTokens,
    usageByDay,
  } = summary.value;

  return successResponse({
    model,
    totalInputTokens,
    totalOutputTokens,
    totalCostUsd: calcCost(totalInputTokens, totalOutputTokens, model),
    currentMonthInputTokens,
    currentMonthOutputTokens,
    currentMonthCostUsd: calcCost(
      currentMonthInputTokens,
      currentMonthOutputTokens,
      model,
    ),
    usageByDay: usageByDay.map((d) => ({
      ...d,
      costUsd: calcCost(d.inputTokens, d.outputTokens, model),
    })),
  });
}
