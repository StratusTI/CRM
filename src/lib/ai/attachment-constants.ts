/**
 * Constantes de anexos compartilhadas entre cliente e servidor. Este módulo
 * NÃO importa nada do servidor (node:crypto, MinIO, pdf-parse…), de modo que
 * pode ser importado com segurança por componentes client.
 */

/** Máximo de arquivos por mensagem. */
export const MAX_ATTACHMENTS = 5;
/** Tamanho máximo por arquivo (10 MB). */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** Tipos aceitos, pronto para o atributo `accept` de um `<input type=file>`. */
export const ACCEPTED_ATTACHMENT_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,application/pdf,.docx,.txt,.md,.csv";
