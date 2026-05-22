import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cn } from "@/lib/utils";

/** Quadrado arredondado colorido com o ícone branco dentro. */
export function IconSquare({
  icon,
  color,
  className,
}: {
  icon: IconSvgElement;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex aspect-square size-6 items-center justify-center rounded-[7px] text-white",
        "shadow-sm ring-1 ring-inset ring-white/15",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-gradient-to-b before:from-white/25 before:to-transparent",
        color,
        className,
      )}
    >
      <HugeiconsIcon
        icon={icon}
        strokeWidth={2}
        className="relative size-3.5 drop-shadow-sm"
      />
    </span>
  );
}
