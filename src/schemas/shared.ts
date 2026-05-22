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
