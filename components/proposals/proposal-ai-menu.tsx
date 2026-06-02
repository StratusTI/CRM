"use client";

import {
  AiBeautifyIcon,
  AiBrainIcon,
  AiContentGeneratorIcon,
  AiEditingIcon,
  Heading01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { Editor } from "@tiptap/react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiUrl } from "@/lib/api-url";

type AiAction = "paraphrase" | "simplify" | "elaborate" | "summarize" | "title";

const ACTIONS: { key: AiAction; label: string; icon: IconSvgElement; requiresSelection: boolean }[] =
  [
    { key: "paraphrase", label: "Parafrasear", icon: AiEditingIcon, requiresSelection: true },
    { key: "simplify", label: "Simplificar", icon: AiBeautifyIcon, requiresSelection: true },
    { key: "elaborate", label: "Elaborar", icon: AiContentGeneratorIcon, requiresSelection: true },
    { key: "summarize", label: "Resumir", icon: AiBrainIcon, requiresSelection: false },
    { key: "title", label: "Gerar título", icon: Heading01Icon, requiresSelection: false },
  ];

async function callAiAction(
  slug: string,
  proposalId: string,
  action: AiAction,
  text: string,
): Promise<string | null> {
  const res = await fetch(
    apiUrl(`/api/workspaces/${slug}/proposals/${proposalId}/ai`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, text }),
    },
  );
  const json = (await res.json()) as { success: boolean; data?: { result: string }; message?: string };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message ?? "Falha ao chamar a IA.");
  }
  return json.data.result;
}

export function ProposalAiMenu({
  editor,
  slug,
  proposalId,
  onTitleChange,
}: {
  editor: Editor;
  slug: string;
  proposalId: string;
  onTitleChange: (title: string) => void;
}) {
  const [loading, setLoading] = React.useState<AiAction | null>(null);

  const run = async (action: AiAction) => {
    const { from, to, empty } = editor.state.selection;
    const meta = ACTIONS.find((a) => a.key === action)!;

    const text = empty
      ? editor.getText()
      : editor.state.doc.textBetween(from, to, "\n");

    if (!text.trim()) {
      toast.error("Nada para processar. Adicione conteúdo ao documento.");
      return;
    }
    if (meta.requiresSelection && empty) {
      toast.error("Selecione um trecho de texto para usar esta ação.");
      return;
    }

    setLoading(action);
    try {
      const result = await callAiAction(slug, proposalId, action, text);
      if (!result) return;

      if (action === "title") {
        onTitleChange(result);
        toast.success("Título atualizado pela IA.");
        return;
      }

      if (action === "summarize" && empty) {
        editor.chain().focus().insertContentAt(0, `<p>${result}</p>`).run();
        toast.success("Resumo inserido no início do documento.");
        return;
      }

      if (!empty) {
        editor.chain().focus().deleteRange({ from, to }).insertContent(result).run();
      } else {
        editor.chain().focus().setContent(`<p>${result}</p>`).run();
      }
      toast.success("Texto atualizado pela IA.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao chamar a IA.");
    } finally {
      setLoading(null);
    }
  };

  const busy = loading !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        nativeButton={true}
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            aria-label="Ferramentas de IA"
            className="gap-1.5 text-muted-foreground hover:text-foreground data-[state=open]:bg-accent"
          >
            <HugeiconsIcon
              icon={SparklesIcon}
              strokeWidth={2}
              className={busy ? "animate-pulse text-primary" : ""}
            />
            IA
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Reescrever</DropdownMenuLabel>
          {ACTIONS.filter((a) => a.requiresSelection).map((action) => (
            <DropdownMenuItem
              key={action.key}
              disabled={busy}
              onClick={() => run(action.key)}
            >
              <HugeiconsIcon icon={action.icon} strokeWidth={2} className="size-4 shrink-0" />
              <span>{action.label}</span>
              {loading === action.key && (
                <span className="ml-auto text-muted-foreground text-xs">...</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Documento</DropdownMenuLabel>
          {ACTIONS.filter((a) => !a.requiresSelection).map((action) => (
            <DropdownMenuItem
              key={action.key}
              disabled={busy}
              onClick={() => run(action.key)}
            >
              <HugeiconsIcon icon={action.icon} strokeWidth={2} className="size-4 shrink-0" />
              <span>{action.label}</span>
              {loading === action.key && (
                <span className="ml-auto text-muted-foreground text-xs">...</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
