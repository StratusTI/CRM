"use client";

import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { convertLead } from "@/src/hooks/use-leads";
import type { LeadDTO } from "@/src/schemas/lead.schema";

/** Ação de conversão do lead, no rodapé do painel de detalhes (renderExtra). */
export function LeadConvert({
  lead,
  slug,
  onConverted,
}: {
  lead: LeadDTO;
  slug: string;
  onConverted: () => void;
}) {
  const [busy, setBusy] = useState(false);

  if (lead.status === "CONVERTED" || lead.convertedOpportunityId) {
    return (
      <div className="flex flex-col gap-2">
        <span className="font-medium text-sm">Convertido</span>
        <p className="text-muted-foreground text-sm">
          Este lead já virou uma pessoa e uma oportunidade.
        </p>
        <div className="flex gap-2">
          {lead.convertedPersonId ? (
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/${slug}/people`} />}
            >
              Ver pessoa
            </Button>
          ) : null}
          {lead.convertedOpportunityId ? (
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/${slug}/opportunities`} />}
            >
              Ver oportunidade
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  async function handleConvert() {
    setBusy(true);
    const result = await convertLead(slug, lead.id);
    setBusy(false);
    if (result.ok) {
      toast.success("Lead convertido em pessoa e oportunidade.");
      onConverted();
    } else {
      toast.error(result.message ?? "Não foi possível converter o lead.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-sm">Conversão</span>
      <p className="text-muted-foreground text-sm">
        Transforme este lead em uma pessoa e uma oportunidade no funil.
      </p>
      <Button
        size="sm"
        className="self-start"
        onClick={handleConvert}
        disabled={busy}
      >
        <HugeiconsIcon icon={ArrowRight02Icon} className="size-4" />
        Converter lead
      </Button>
    </div>
  );
}
