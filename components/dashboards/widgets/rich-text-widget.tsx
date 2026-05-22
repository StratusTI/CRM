"use client";

import type { RichTextConfig } from "@/src/schemas/dashboard-widget.schema";

export function RichTextWidget({ config }: { config: RichTextConfig }) {
  if (!config.html?.trim()) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        Sem conteúdo. Edite o widget para escrever.
      </div>
    );
  }
  return (
    // Conteúdo gerado pelo nosso próprio editor Tiptap (HTML confiável).
    <div
      className="tiptap h-full overflow-y-auto"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML do nosso editor
      dangerouslySetInnerHTML={{ __html: config.html }}
    />
  );
}
