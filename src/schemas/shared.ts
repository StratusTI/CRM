import { z } from "zod";

/** Reordenação manual (drag-drop): a nova ordem completa dos ids visíveis. */
export const ReorderSchema = z.object({
  ids: z.array(z.string().trim().min(1)).max(2000),
});

export type ReorderInput = z.infer<typeof ReorderSchema>;

/**
 * URL tolerante: aceita com ou sem `http(s)://` e com ou sem `www.`,
 * normalizando tudo para `https://<host><path>`. Ex.:
 * - `linkedin.com/in/ada` → `https://linkedin.com/in/ada`
 * - `https://www.linkedin.com/in/ada` → `https://linkedin.com/in/ada`
 */
/**
 * Telefone brasileiro tolerante: aceita qualquer pontuação/espaçamento e
 * normaliza para o padrão `+55 (DD) 99999-9999` (celular, 9 dígitos) ou
 * `+55 (DD) 9999-9999` (fixo, 8 dígitos). Remove o código do país (`55`) e
 * o tronco interurbano (`0`) quando presentes. Ex.:
 * - `11999998888`        → `+55 (11) 99999-8888`
 * - `(11) 99999-8888`    → `+55 (11) 99999-8888`
 * - `+55 11 99999 8888`  → `+55 (11) 99999-8888`
 * Se o número não tiver um formato reconhecível (DDD + 8/9 dígitos), o valor
 * original é mantido — preferimos não corromper o dado.
 */
export function normalizeBrazilPhone(raw: string): string {
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;

  // Código do país: remove o `55` inicial (presença sinalizada pelo tamanho).
  if (digits.length >= 12 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  // Tronco interurbano: remove o `0` inicial (ex.: `011`).
  if (digits.length >= 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (rest.length === 9) {
    return `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  }
  if (rest.length === 8) {
    return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  return trimmed;
}

/**
 * Normaliza um host de domínio: aceita uma URL colada
 * (`https://www.acme.com/sobre`) e reduz ao host puro em minúsculas
 * (`acme.com`). Fonte única usada pelo schema de Company e pela ingestão de
 * formulários — garante dedupe consistente por domínio.
 */
export function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "") // protocolo
    .replace(/^www\./, "") // subdomínio www
    .replace(/[/?#].*$/, "") // caminho/query/hash
    .replace(/:\d+$/, ""); // porta
}

export function normalizedUrl(message: string, max = 500) {
  return z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => {
      const stripped = value.replace(/^https?:\/\//, "").replace(/^www\./, "");
      return stripped ? `https://${stripped}` : stripped;
    })
    .pipe(
      z
        .url(message)
        .max(max)
        // `z.url()` aceita `https://acme` (sem TLD); exige um host com ponto.
        .refine((url) => {
          try {
            return new URL(url).hostname.includes(".");
          } catch {
            return false;
          }
        }, message),
    );
}
