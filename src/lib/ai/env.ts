/**
 * Configuração do provedor de IA (OpenAI). Lido de `process.env` no servidor.
 * A feature é gateada por `isAiConfigured()`: sem `OPENAI_API_KEY`, o widget
 * some no frontend e a rota de chat retorna `AI_NOT_CONFIGURED`.
 */

export function getOpenAiKey(): string {
  return process.env.OPENAI_API_KEY?.trim() ?? "";
}

export function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o";
}

export function getOpenAiBaseUrl(): string {
  const raw = process.env.OPENAI_BASE_URL?.trim();
  return (raw || "https://api.openai.com/v1").replace(/\/+$/, "");
}

export function isAiConfigured(): boolean {
  return getOpenAiKey().length > 0;
}
