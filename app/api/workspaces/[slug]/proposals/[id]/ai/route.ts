import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  aiNotConfigured,
  appError,
  validationError,
} from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { streamChat } from "@/src/lib/ai/client";
import { isAiConfigured } from "@/src/lib/ai/env";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = { params: Promise<{ slug: string; id: string }> };

const ActionSchema = z.object({
  action: z.enum(["paraphrase", "simplify", "elaborate", "summarize", "title"]),
  text: z.string().min(1).max(20_000),
});

const SYSTEM_PROMPTS: Record<z.infer<typeof ActionSchema>["action"], string> = {
  paraphrase:
    "You are an expert editor. Rewrite the given text with different wording while preserving the original meaning, tone, and length. Return only the rewritten text—no explanations.",
  simplify:
    "You are an expert editor. Simplify the given text to make it clearer and easier to understand, using shorter sentences and simpler vocabulary. Return only the simplified text—no explanations.",
  elaborate:
    "You are an expert editor. Expand the given text with more detail, examples, or context while keeping the same meaning and tone. Return only the elaborated text—no explanations.",
  summarize:
    "You are an expert editor. Write a concise summary of the given text, capturing the key points. Return only the summary—no explanations.",
  title:
    "You are an expert editor. Based on the given text, generate a short, compelling title (max 10 words). Return only the title—no punctuation at the end, no explanations.",
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  if (!isAiConfigured()) return handleError(aiNotConfigured());

  const body = await request.json().catch(() => null);
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const { action, text } = parsed.data;
  const systemPrompt = SYSTEM_PROMPTS[action];

  let result = "";
  for await (const event of streamChat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ],
    [],
  )) {
    if (event.type === "text") result += event.delta;
    if (event.type === "error") {
      return handleError(appError("INTERNAL_SERVER_ERROR", event.message));
    }
  }

  return successResponse({ result: result.trim() });
}
