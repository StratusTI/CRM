import { cn } from "@/lib/utils";

/**
 * Marca do Arco: arco arquitetônico — duas colunas unidas por uma curva.
 * Representa conexão, solidez e amplitude.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-[0_2px_12px_-2px_var(--primary)] ring-1 ring-inset ring-white/25",
        "before:absolute before:inset-0 before:rounded-[inherit] before:bg-gradient-to-b before:from-white/30 before:to-transparent",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="relative size-5"
        aria-hidden="true"
      >
        <path
          d="M5 19.5L5 12C5 4.5 19 4.5 19 12L19 19.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/** Logotipo: marca + wordmark. */
export function BrandLockup({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="font-heading font-semibold text-lg tracking-tight">
        Arco
      </span>
    </div>
  );
}
