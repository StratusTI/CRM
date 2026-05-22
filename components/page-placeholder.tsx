import { Wrench01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/** Placeholder de página enquanto a UI da feature não é construída. */
export function PagePlaceholder({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="grain relative flex h-full flex-col items-center justify-center gap-4 overflow-hidden bg-grid px-6 text-center">
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(40rem_28rem_at_50%_40%,black,transparent)] bg-mesh opacity-60" />
      <div className="relative flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-card/70 text-muted-foreground shadow-sm backdrop-blur">
        <HugeiconsIcon
          icon={Wrench01Icon}
          strokeWidth={1.7}
          className="size-6"
        />
      </div>
      <div className="relative max-w-md space-y-1.5">
        <h2 className="font-heading font-semibold text-2xl tracking-tight">
          {title}
        </h2>
        <p className="text-muted-foreground text-sm">
          {description ?? "Esta área ainda será construída."}
        </p>
      </div>
      <span className="relative inline-flex items-center rounded-full border border-border/70 bg-card/60 px-2.5 py-0.5 font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-wider backdrop-blur">
        Em breve
      </span>
    </div>
  );
}
