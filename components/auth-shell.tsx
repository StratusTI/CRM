import type { ReactNode } from "react";
import { BrandLockup } from "@/components/brand-mark";

/**
 * Casca das telas públicas (sign-in / sign-up / criar workspace): fundo em
 * mesh com grão fino, logotipo no topo e o conteúdo centralizado.
 */
export function AuthShell({
  children,
  tagline,
}: {
  children: ReactNode;
  tagline?: string;
}) {
  return (
    <div className="grain relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden bg-mesh px-6 py-10">
      {/* faixa de grade tênue ao fundo */}
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.4] [mask-image:radial-gradient(60rem_40rem_at_50%_0%,black,transparent)]" />

      <div className="relative flex w-full max-w-sm animate-rise flex-col gap-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandLockup />
          {tagline ? (
            <p className="text-balance text-muted-foreground text-sm">
              {tagline}
            </p>
          ) : null}
        </div>
        {children}
      </div>

      <p className="relative mt-10 text-muted-foreground/70 text-xs">
        © 2026 Nexo
      </p>
    </div>
  );
}
