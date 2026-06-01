import {
  Details,
  DetailsContent,
  DetailsSummary,
} from "@tiptap/extension-details";
import { Image } from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import type { Extensions } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Audio, Video } from "@/components/rich-text/nodes";
import { SlashCommand } from "@/components/rich-text/slash-command";

/**
 * Nodes/marks comuns a todo render de rich text (editor + viewer read-only).
 * Sem o menu de barra "/" — esse só faz sentido na edição.
 */
const BASE_EXTENSIONS: Extensions = [
  StarterKit,
  TaskList,
  TaskItem.configure({ nested: true }),
  Details.configure({ persist: true }),
  DetailsSummary,
  DetailsContent,
  TableKit,
  Image,
  Video,
  Audio,
];

/** Extensões do editor (inclui o comando "/"). */
export const RICH_TEXT_EXTENSIONS: Extensions = [
  ...BASE_EXTENSIONS,
  SlashCommand,
];

/** Extensões para render read-only (página pública) — sem o menu "/". */
export const READONLY_RICH_TEXT_EXTENSIONS: Extensions = BASE_EXTENSIONS;
