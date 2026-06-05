import type { NextRequest } from "next/server";
import { getAuthSession } from "@/src/lib/auth-session";
import { LandingPageService } from "@/src/services/landing-page.service";
import { handleError } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; id: string; attachmentId: string }>;
};

/** Serve os bytes de um anexo do chat de geração (imagem ou documento). */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, id, attachmentId } = await params;
  const result = await LandingPageService.getAttachment(
    session.value.user.id,
    slug,
    id,
    attachmentId,
  );
  if (!result.ok) return handleError(result.error);

  return new Response(result.value.bytes, {
    headers: {
      "Content-Type": result.value.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
