import type { ReactNode } from "react";
import { BrandLockup } from "@/components/brand-mark";

const FEATURES = [
  "Gerencie empresas, pessoas e oportunidades",
  "Envie campanhas de email com listas de mailing",
  "Acompanhe redes sociais e analytics",
  "Automatize fluxos com workflows",
];

export function AuthShell({
  children,
  tagline,
}: {
  children: ReactNode;
  tagline?: string;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* ── Painel esquerdo: marca ────────────────────────────────── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-zinc-950 p-10 text-white lg:flex">
        {/* Grade tênue de fundo */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Suaviza as bordas da grade */}
        <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black_50%,transparent_100%)]" />

        {/* Logo */}
        <div className="relative">
          <BrandLockup className="[&>span:last-child]:text-white" />
        </div>

        {/* Tagline + features */}
        <div className="relative space-y-7">
          {tagline && (
            <p className="text-balance text-2xl font-semibold leading-snug tracking-tight text-white/90">
              {tagline}
            </p>
          )}
          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-white/55">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70">
                  <svg viewBox="0 0 12 12" className="size-3" fill="none">
                    <path
                      d="M2.5 6 L5 8.5 L9.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Rodapé */}
        <p className="relative text-xs text-white/25">© 2026 Arco</p>
      </div>

      {/* ── Painel direito: formulário ────────────────────────────── */}
      <div className="flex flex-col items-center justify-center px-6 py-12 sm:px-10">
        {/* Logo visível apenas no mobile */}
        <div className="mb-8 lg:hidden">
          <BrandLockup />
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
