/**
 * Prompt do construtor de landing pages com IA (estilo Lovable/v0).
 *
 * O modelo SEMPRE devolve um documento HTML completo e autocontido — nunca um
 * diff nem um fragmento. Tailwind entra via CDN, então não há etapa de build.
 * Botões/links de conversão são marcados com `data-cta` para que a página
 * pública consiga contabilizar cliques de CTA nas métricas.
 */

const RULES = `Você é um designer e engenheiro front-end especialista em landing pages de alta conversão. Sua tarefa é gerar uma landing page como UM ÚNICO documento HTML completo e autocontido, em português do Brasil (salvo pedido contrário).

REGRAS OBRIGATÓRIAS:
- Devolva SOMENTE o HTML, começando em \`<!DOCTYPE html>\` e terminando em \`</html>\`. Sem comentários, sem explicações, sem cercas de código.
- Inclua Tailwind via CDN no <head>: <script src="https://cdn.tailwindcss.com"></script>.
- Estruture com seções semânticas (header, hero, features, prova social, FAQ, CTA, footer) conforme o contexto. Use bom espaçamento, hierarquia tipográfica e design responsivo (mobile-first).
- TODO botão ou link de conversão (comprar, assinar, falar com vendas, cadastrar, baixar) DEVE ter o atributo data-cta — ex.: <a href="#" data-cta>Começar agora</a>. Isso é essencial para as métricas.
- Não use imagens externas que possam quebrar; prefira gradientes, ícones SVG inline e cores sólidas. Se usar placeholder, use https://placehold.co.
- Não inclua JavaScript de rastreio — a plataforma injeta o dela automaticamente.
- O documento deve ser válido, acessível (labels, alt, contraste) e pronto para publicar.`;

/** System prompt para gerar uma página do zero. */
export function buildCreateSystemPrompt(): string {
  return `${RULES}\n\nO usuário vai descrever a página que deseja. Gere a melhor versão possível.`;
}

/** System prompt para editar uma página existente a partir do HTML atual. */
export function buildEditSystemPrompt(currentHtml: string): string {
  return `${RULES}

Você está EDITANDO uma página existente. Aplique a alteração pedida pelo usuário preservando o restante do documento (conteúdo, estilo e estrutura que não foram mencionados). Devolva o documento HTML completo atualizado.

HTML ATUAL DA PÁGINA:
${currentHtml}`;
}

/**
 * Extrai o documento HTML da resposta do modelo: remove cercas de código
 * (\`\`\`html ... \`\`\`) e texto antes do <!DOCTYPE/<html>. Se nada casar,
 * devolve o texto aparado.
 */
export function extractHtml(raw: string): string {
  let text = raw.trim();

  // Remove cercas de código, se houver.
  const fence = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) text = fence[1].trim();

  // Recorta a partir do <!DOCTYPE ...> ou <html ...>, se presente.
  const start = text.search(/<!DOCTYPE html|<html[\s>]/i);
  if (start > 0) text = text.slice(start);

  return text.trim();
}
