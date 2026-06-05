/**
 * Configuração dos provedores de IA (OpenAI e Anthropic/Claude). Lido de
 * `process.env` no servidor. A feature é gateada por `isAiConfigured()`: sem
 * nenhuma chave de provedor, o widget some no frontend e as rotas de chat
 * retornam `AI_NOT_CONFIGURED`. O usuário escolhe o provedor no chat; a seleção
 * cai para um provedor disponível quando o pedido não está configurado.
 */

/** Provedores de IA suportados. O valor é o que trafega da UI até o client. */
export const AI_PROVIDERS = ["openai", "anthropic"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

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

export function isOpenAiConfigured(): boolean {
  return getOpenAiKey().length > 0;
}

export function getAnthropicKey(): string {
  return process.env.ANTHROPIC_API_KEY?.trim() ?? "";
}

export function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-4-8";
}

export function isAnthropicConfigured(): boolean {
  return getAnthropicKey().length > 0;
}

/** Lista dos provedores com chave configurada, na ordem de preferência. */
export function availableAiProviders(): AiProvider[] {
  const list: AiProvider[] = [];
  if (isOpenAiConfigured()) list.push("openai");
  if (isAnthropicConfigured()) list.push("anthropic");
  return list;
}

/** Há ao menos um provedor de IA configurado? */
export function isAiConfigured(): boolean {
  return availableAiProviders().length > 0;
}

/**
 * Resolve o provedor efetivo: usa o pedido se estiver configurado; senão cai
 * para o primeiro disponível. Retorna `null` quando nenhum está configurado.
 */
export function resolveAiProvider(requested?: AiProvider): AiProvider | null {
  const available = availableAiProviders();
  if (available.length === 0) return null;
  if (requested && available.includes(requested)) return requested;
  return available[0];
}
