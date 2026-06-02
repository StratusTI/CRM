import { BendToolIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

/**
 * Marca do Arco: arco arquitetônico — duas colunas unidas por uma curva.
 * Representa conexão, solidez e amplitude.
 */
export function BrandMark() {
  return (
    <span>
      <HugeiconsIcon icon={BendToolIcon} size={26} strokeWidth={2} />
    </span>
  );
}

/** Logotipo: marca + wordmark. */
export function BrandLockup({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      <BrandMark />
      <span className="font-heading font-semibold text-2xl tracking-tight">
        Arco
      </span>
    </div>
  );
}
