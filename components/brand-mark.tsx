import { cn } from "@/lib/utils";

/**
 * Marca do Nexo: dois nós conectados por um traço — o "nexo".
 * Tile lime com brilho, alinhado ao acento do tema.
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
          d="M7 8.5 L17 15.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <circle cx="7" cy="8.5" r="2.6" fill="currentColor" />
        <circle cx="17" cy="15.5" r="2.6" fill="currentColor" />
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
        Nexo
      </span>
    </div>
  );
}
