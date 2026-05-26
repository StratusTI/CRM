import type { Instrumentation } from "next";

// Captura erros server-side com a mensagem original (Next mascara em prod).
// Loga em stderr; o container loga via `docker logs`.
export const onRequestError: Instrumentation.onRequestError = (
  err,
  request,
  context,
) => {
  const error = err as Error & { digest?: string };
  // biome-ignore lint/suspicious/noConsole: server-side error reporter
  console.error("[onRequestError]", {
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
    renderType: context.renderType,
    digest: error.digest,
    message: error.message,
    stack: error.stack,
  });
};

export async function register() {}
