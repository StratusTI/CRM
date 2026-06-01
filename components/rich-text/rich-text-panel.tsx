"use client";

import {
  ArrowLeft01Icon,
  Cancel01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import * as React from "react";
import {
  BLOCK_ITEMS,
  EMOJI_ICON,
  EMOJIS,
} from "@/components/rich-text/insert-items";
import { RICH_TEXT_EXTENSIONS } from "@/components/rich-text/tiptap-extensions";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

/** Menu de inserção (botão "+"): blocos + grade de emojis. */
function InsertMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = React.useState(false);
  const [emojiView, setEmojiView] = React.useState(false);

  function run(action: (editor: Editor) => void) {
    action(editor);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setEmojiView(false);
      }}
    >
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" aria-label="Inserir bloco" />
        }
      >
        <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
        Inserir
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-80 w-56 gap-0 overflow-y-auto p-1"
      >
        {emojiView ? (
          <div className="grid gap-1">
            <button
              type="button"
              onClick={() => setEmojiView(false)}
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                strokeWidth={2}
                className="size-4 text-muted-foreground"
              />
              Voltar
            </button>
            <div className="grid grid-cols-8 gap-0.5 p-1">
              {EMOJIS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() =>
                    run((e) => e.chain().focus().insertContent(emoji).run())
                  }
                  className="flex size-7 items-center justify-center rounded-sm text-base hover:bg-accent"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid">
            {BLOCK_ITEMS.map((item) => (
              <button
                type="button"
                key={item.key}
                onClick={() => run(item.action)}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <HugeiconsIcon
                  icon={item.icon}
                  strokeWidth={2}
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="truncate">{item.title}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setEmojiView(true)}
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <HugeiconsIcon
                icon={EMOJI_ICON}
                strokeWidth={2}
                className="size-4 shrink-0 text-muted-foreground"
              />
              <span className="truncate">Emoji</span>
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function RichTextBody({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: RICH_TEXT_EXTENSIONS,
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "tiptap min-h-full focus:outline-none" },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 justify-end">
        {editor ? <InsertMenu editor={editor} /> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border bg-background px-4 py-3">
        {editor ? <EditorContent editor={editor} /> : null}
      </div>
    </div>
  );
}

/** Painel lateral grande com o editor rich text (estilo do painel do item). */
export function RichTextPanel({
  open,
  onOpenChange,
  value,
  title,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  title: string;
  onSave: (html: string) => void;
}) {
  const latest = React.useRef(value);
  React.useEffect(() => {
    latest.current = value;
  }, [value]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex w-[640px] max-w-[640px] flex-col gap-0 p-0 sm:max-w-[640px]"
      >
        {/* Cabeçalho: X (cancelar) à esquerda */}
        <div className="flex items-center gap-2 border-b p-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label="Cancelar"
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
          </Button>
          <SheetTitle className="truncate capitalize">{title}</SheetTitle>
        </div>

        <div className="min-h-0 flex-1 p-4">
          {open ? (
            <RichTextBody
              value={value}
              onChange={(html) => {
                latest.current = html;
              }}
            />
          ) : null}
        </div>

        <div className="flex items-center justify-end border-t p-3">
          <Button
            onClick={() => {
              onSave(latest.current);
              onOpenChange(false);
            }}
          >
            Salvar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
