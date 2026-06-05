import { randomUUID } from "node:crypto";
import type { AiAttachmentKind } from "@prisma/client";
import { badRequest, storageNotConfigured } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { isStorageConfigured, putObject } from "@/src/lib/storage/s3";
import type { ContentPart } from "./client";

/**
 * Anexos enviados pelo usuário como base para a IA (paleta de cores, brand
 * book, briefing etc.). Imagens vão ao modelo por vision (data URL base64);
 * documentos têm o texto extraído no servidor (PDF/DOCX/TXT/MD/CSV) e injetado
 * no contexto. Os bytes são persistidos no MinIO; o texto extraído é cacheado
 * em `AiAttachment.extractedText` para reinjeção barata em follow-ups.
 */

/** Máximo de arquivos por mensagem. */
export const MAX_ATTACHMENTS = 5;
/** Tamanho máximo por arquivo (10 MB). */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
/** Teto de caracteres por documento extraído (contém o custo de tokens). */
const MAX_DOC_CHARS = 30_000;

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

/** Mapeia content-type → como o documento será lido. */
const DOC_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
]);

const DOC_EXTENSIONS = /\.(pdf|docx|txt|md|markdown|csv)$/i;

/** Lista de tipos aceitos, pronta para o atributo `accept` de um input. */
export const ACCEPTED_ATTACHMENT_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,application/pdf,.docx,.txt,.md,.csv";

/** Classifica um arquivo; `null` = tipo não suportado. */
export function classifyKind(
  contentType: string,
  filename: string,
): AiAttachmentKind | null {
  if (IMAGE_TYPES.has(contentType)) return "IMAGE";
  if (DOC_TYPES.has(contentType) || DOC_EXTENSIONS.test(filename)) {
    return "DOCUMENT";
  }
  return null;
}

/** Anexo já processado (bytes no MinIO, texto extraído), pronto para persistir. */
export type ProcessedAttachment = {
  kind: AiAttachmentKind;
  filename: string;
  contentType: string;
  size: number;
  storageKey: string;
  /** Texto extraído (documentos). `null` para imagens. */
  extractedText: string | null;
  /** Data URL base64 para vision (imagens no turno em que foram anexadas). */
  dataUrl: string | null;
};

/** Subconjunto necessário para montar o conteúdo enviado ao modelo. */
export type AttachmentForContent = {
  kind: AiAttachmentKind;
  filename: string;
  extractedText: string | null;
  /** Presente só para imagens no turno original (vision). */
  dataUrl: string | null;
};

function safeName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "arquivo";
  return base.replace(/[^\w.-]+/g, "_").slice(0, 120) || "arquivo";
}

/** Valida contagem, tamanho e tipo dos arquivos. */
export function validateFiles(files: File[]): Result<void> {
  if (files.length > MAX_ATTACHMENTS) {
    return err(badRequest(`Máximo de ${MAX_ATTACHMENTS} anexos por mensagem.`));
  }
  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return err(badRequest(`"${file.name}" excede o limite de 10 MB.`));
    }
    if (file.size === 0) {
      return err(badRequest(`"${file.name}" está vazio.`));
    }
    if (!classifyKind(file.type, file.name)) {
      return err(
        badRequest(
          `"${file.name}": tipo não suportado. Use imagens, PDF, DOCX, TXT, MD ou CSV.`,
        ),
      );
    }
  }
  return ok(undefined);
}

/** Extrai texto de um documento, com teto de caracteres. */
async function extractText(
  bytes: Uint8Array,
  contentType: string,
  filename: string,
): Promise<string> {
  try {
    let text = "";
    if (contentType === "application/pdf" || /\.pdf$/i.test(filename)) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: bytes });
      const result = await parser.getText();
      await parser.destroy();
      text = result.text;
    } else if (
      contentType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      /\.docx$/i.test(filename)
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({
        buffer: Buffer.from(bytes),
      });
      text = result.value;
    } else {
      // text/plain, markdown, csv
      text = new TextDecoder().decode(bytes);
    }
    text = text.trim();
    return text.length > MAX_DOC_CHARS
      ? `${text.slice(0, MAX_DOC_CHARS)}\n…[truncado]`
      : text;
  } catch (error) {
    console.error("[ai-attachments] falha ao extrair texto", filename, error);
    return "";
  }
}

/**
 * Valida, persiste no MinIO e extrai o texto dos arquivos. `keyPrefix` escopa
 * as chaves no bucket (ex.: `ai/<workspaceId>`). Devolve descritores prontos
 * para criar as linhas `AiAttachment`.
 */
export async function processUploads(
  files: File[],
  keyPrefix: string,
): Promise<Result<ProcessedAttachment[]>> {
  if (files.length === 0) return ok([]);
  if (!isStorageConfigured()) return err(storageNotConfigured());

  const valid = validateFiles(files);
  if (!valid.ok) return valid;

  const processed: ProcessedAttachment[] = [];
  for (const file of files) {
    const kind = classifyKind(file.type, file.name);
    if (!kind) continue; // já validado acima; defensivo
    const bytes = new Uint8Array(await file.arrayBuffer());
    const contentType = file.type || "application/octet-stream";
    const storageKey = `${keyPrefix}/${randomUUID()}-${safeName(file.name)}`;

    await putObject(storageKey, bytes, contentType);

    if (kind === "IMAGE") {
      const base64 = Buffer.from(bytes).toString("base64");
      processed.push({
        kind,
        filename: file.name,
        contentType,
        size: file.size,
        storageKey,
        extractedText: null,
        dataUrl: `data:${contentType};base64,${base64}`,
      });
    } else {
      const extractedText = await extractText(bytes, contentType, file.name);
      processed.push({
        kind,
        filename: file.name,
        contentType,
        size: file.size,
        storageKey,
        extractedText: extractedText || null,
        dataUrl: null,
      });
    }
  }
  return ok(processed);
}

/**
 * Monta o conteúdo do turno de usuário a partir do texto digitado + anexos.
 * Documentos viram blocos de texto; imagens com `dataUrl` viram partes
 * `image_url` (vision). Imagens sem `dataUrl` (turnos antigos do histórico)
 * viram apenas uma nota textual, para não estourar o custo de tokens.
 *
 * Retorna `string` quando não há imagem a embutir (compatível com o formato
 * antigo) e `ContentPart[]` quando há ao menos uma imagem para vision.
 */
export function buildUserContent(
  text: string,
  attachments: AttachmentForContent[],
): string | ContentPart[] {
  if (attachments.length === 0) return text;

  const docs = attachments.filter((a) => a.kind === "DOCUMENT");
  const images = attachments.filter((a) => a.kind === "IMAGE");
  const embeddable = images.filter((a) => a.dataUrl);
  const noteImages = images.filter((a) => !a.dataUrl);

  const header =
    "[Materiais de referência anexados pelo usuário — use-os como base.]";
  let block = text.trim() ? `${text.trim()}\n\n${header}` : header;

  for (const d of docs) {
    const t = d.extractedText?.trim();
    block += t
      ? `\n\n=== Documento: ${d.filename} ===\n${t}\n=== fim de ${d.filename} ===`
      : `\n\n[Documento anexado: ${d.filename} (sem texto extraível)]`;
  }
  for (const img of noteImages) {
    block += `\n\n[Imagem anexada: ${img.filename}]`;
  }

  if (embeddable.length === 0) return block;

  const parts: ContentPart[] = [{ type: "text", text: block }];
  for (const img of embeddable) {
    if (img.dataUrl)
      parts.push({ type: "image_url", image_url: { url: img.dataUrl } });
  }
  return parts;
}
