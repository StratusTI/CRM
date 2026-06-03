import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { RecordLandingEventSchema } from "@/src/schemas/landing-page.schema";
import { LandingPageService } from "@/src/services/landing-page.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ "workspace-slug": string; "page-slug": string }>;
};

/** IP do cliente a partir dos headers de proxy (nunca confia no corpo). */
function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Script de rastreio injetado na página pública. Mede tempo ativo (só com a aba
 * visível) e cliques em CTA (`[data-cta]`), enviando beacons para a própria URL
 * via `navigator.sendBeacon`. `viewId` é estável por aba (sessionStorage).
 */
const TRACKER_SCRIPT = `<script>(function(){
  try {
    var url = window.location.pathname;
    var key = "lp-view:" + url;
    var viewId = sessionStorage.getItem(key);
    if (!viewId) { viewId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()); sessionStorage.setItem(key, viewId); }
    var activeMs = 0, lastTick = Date.now(), ctaClicks = 0;
    function visible(){ return document.visibilityState === "visible"; }
    function accrue(){ var now = Date.now(); if (visible()) activeMs += now - lastTick; lastTick = now; }
    function send(){
      accrue();
      var body = JSON.stringify({ viewId: viewId, durationMs: Math.round(activeMs), ctaClicks: ctaClicks });
      try { if (navigator.sendBeacon) { navigator.sendBeacon(url, new Blob([body], { type: "application/json" })); return; } } catch (e) {}
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true }).catch(function(){});
    }
    send();
    setInterval(accrue, 1000);
    setInterval(send, 15000);
    document.addEventListener("visibilitychange", function(){ accrue(); if (!visible()) send(); });
    window.addEventListener("pagehide", send);
    document.addEventListener("click", function(e){
      var el = e.target && e.target.closest ? e.target.closest("[data-cta], a[href], button") : null;
      if (el) { ctaClicks++; send(); }
    }, true);
  } catch (e) {}
})();</script>`;

/** Injeta o script de rastreio antes de </body> (ou no fim, se ausente). */
function injectTracker(html: string): string {
  const idx = html.toLowerCase().lastIndexOf("</body>");
  if (idx === -1) return html + TRACKER_SCRIPT;
  return html.slice(0, idx) + TRACKER_SCRIPT + html.slice(idx);
}

const NOT_AVAILABLE_HTML = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Página indisponível</title><script src="https://cdn.tailwindcss.com"></script></head><body class="flex min-h-screen flex-col items-center justify-center gap-2 bg-neutral-50 px-6 text-center text-neutral-700"><h1 class="text-lg font-semibold">Página indisponível</h1><p class="max-w-md text-sm text-neutral-500">Este link pode ter sido despublicado ou não existe mais.</p></body></html>`;

/** Render público da landing page (HTML real + script de rastreio). */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { "workspace-slug": workspaceSlug, "page-slug": pageSlug } =
    await params;

  const result = await LandingPageService.getPublicBySlug(
    workspaceSlug,
    pageSlug,
  );

  if (!result.ok) {
    return new Response(NOT_AVAILABLE_HTML, {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new Response(injectTracker(result.value.html), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

/**
 * Endpoint de evento — sem auth. A posse vem dos slugs públicos. O corpo chega
 * via `fetch`/`navigator.sendBeacon`. Registra/atualiza a métrica de acesso.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { "workspace-slug": workspaceSlug, "page-slug": pageSlug } =
    await params;

  const body = await request.json().catch(() => null);
  const parsed = RecordLandingEventSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const result = await LandingPageService.recordEvent(
    workspaceSlug,
    pageSlug,
    parsed.data,
    { ip: clientIp(request), referrer: request.headers.get("referer") },
  );
  if (!result.ok) return handleError(result.error);

  return successResponse({ recorded: true }, 202);
}
