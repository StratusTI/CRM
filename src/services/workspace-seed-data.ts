import { randomBytes } from "node:crypto";
import type { DocumentType, WidgetType } from "@prisma/client";
import {
  type ChartConfig,
  ChartConfigSchema,
  type RichTextConfig,
  RichTextConfigSchema,
  type ViewConfig,
  ViewConfigSchema,
} from "@/src/schemas/dashboard-widget.schema";

/**
 * Conteúdo dos exemplos criados junto com toda workspace nova (ver
 * `WorkspaceRepository.createWithOwner`). Dois documentos e dois dashboards
 * prontos para o usuário ver a funcionalidade "viva" — registros normais que
 * ele pode editar ou excluir. Os charts ficam vazios até haver dados no CRM;
 * por isso cada dashboard abre com um bloco de texto explicando o que é.
 */

/** Token opaco do link público — emitido no servidor, único por documento. */
export function makeShareToken(): string {
  return randomBytes(16).toString("hex");
}

/* -------------------------------- documentos ------------------------------- */

export type SeedDocument = {
  title: string;
  type: DocumentType;
  content: string;
};

const PROPOSAL_HTML = `
<h1>Proposta Comercial — Projeto Exemplo</h1>
<p><strong>Para:</strong> Cliente Exemplo Ltda. &nbsp;·&nbsp; <strong>De:</strong> Sua Empresa</p>
<blockquote><p>📄 Este é um documento de exemplo criado automaticamente. Edite o conteúdo, publique para gerar um link compartilhável ou exclua à vontade.</p></blockquote>
<h2>Resumo executivo</h2>
<p>Apresentamos nossa proposta para o desenvolvimento do projeto, estruturada para entregar valor desde a primeira fase. Substitua este texto pelo contexto do seu cliente, os objetivos do projeto e os resultados esperados.</p>
<h2>Escopo do projeto</h2>
<ul>
<li>Descoberta e alinhamento de objetivos</li>
<li>Design e validação da solução</li>
<li>Implementação e testes</li>
<li>Treinamento e acompanhamento pós-entrega</li>
</ul>
<h2>Cronograma</h2>
<ol>
<li><strong>Semana 1–2:</strong> descoberta e planejamento</li>
<li><strong>Semana 3–5:</strong> execução</li>
<li><strong>Semana 6:</strong> revisão, ajustes e entrega final</li>
</ol>
<h2>Investimento</h2>
<table>
<tbody>
<tr><th>Item</th><th>Descrição</th><th>Valor</th></tr>
<tr><td>Fase 1</td><td>Descoberta e planejamento</td><td>R$ 4.000</td></tr>
<tr><td>Fase 2</td><td>Execução</td><td>R$ 10.000</td></tr>
<tr><td>Fase 3</td><td>Entrega e acompanhamento</td><td>R$ 3.000</td></tr>
<tr><td><strong>Total</strong></td><td></td><td><strong>R$ 17.000</strong></td></tr>
</tbody>
</table>
<h2>Condições comerciais</h2>
<ul>
<li>Validade da proposta: 30 dias</li>
<li>Forma de pagamento: 40% na assinatura, 60% na entrega</li>
</ul>
<h2>Próximos passos</h2>
<p>Para seguirmos, basta responder este documento confirmando o aceite. Em seguida agendamos a reunião de kickoff.</p>
`.trim();

const PORTFOLIO_HTML = `
<h1>Portfólio de Serviços</h1>
<blockquote><p>📁 Documento de exemplo do tipo <em>Portfólio</em>. Use-o para apresentar sua empresa, serviços e resultados. Edite ou exclua quando quiser.</p></blockquote>
<h2>Quem somos</h2>
<p>Somos uma equipe dedicada a resolver os desafios dos nossos clientes com soluções sob medida. Conte aqui a história, a missão e o diferencial da sua empresa.</p>
<h2>Nossos serviços</h2>
<h3>Consultoria</h3>
<p>Diagnóstico e plano de ação para destravar o crescimento do seu negócio.</p>
<h3>Implementação</h3>
<p>Execução ponta a ponta, com acompanhamento e transparência em cada etapa.</p>
<h3>Suporte contínuo</h3>
<p>Acompanhamento recorrente para garantir resultados sustentáveis.</p>
<h2>Resultados</h2>
<table>
<tbody>
<tr><th>Indicador</th><th>Resultado</th></tr>
<tr><td>Projetos entregues</td><td>+120</td></tr>
<tr><td>Satisfação dos clientes</td><td>98%</td></tr>
<tr><td>Tempo médio de entrega</td><td>6 semanas</td></tr>
</tbody>
</table>
<h2>O que dizem sobre nós</h2>
<blockquote><p>"A parceria superou nossas expectativas — recomendamos sem hesitar."<br>— Cliente satisfeito</p></blockquote>
<h2>Vamos conversar?</h2>
<p>Entre em contato para entendermos como podemos ajudar o seu projeto a ir além.</p>
`.trim();

export const SEED_DOCUMENTS: SeedDocument[] = [
  {
    title: "Proposta Comercial — Projeto Exemplo",
    type: "PROPOSAL",
    content: PROPOSAL_HTML,
  },
  {
    title: "Portfólio de Serviços",
    type: "PORTFOLIO",
    content: PORTFOLIO_HTML,
  },
];

/* -------------------------------- dashboards ------------------------------- */

export type SeedWidget = {
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  config: ChartConfig | ViewConfig | RichTextConfig;
};

export type SeedDashboard = {
  title: string;
  widgets: SeedWidget[];
};

/** Helpers: validam/preenchem os defaults da config como a API faria. */
const chart = (
  input: Partial<ChartConfig> & { chartType: ChartConfig["chartType"] },
) => ChartConfigSchema.parse(input);
const view = (input: { source: ViewConfig["source"] } & Partial<ViewConfig>) =>
  ViewConfigSchema.parse(input);
const richText = (html: string) => RichTextConfigSchema.parse({ html });

const COMMERCIAL_INTRO = richText(
  `<h2>👋 Bem-vindo à Visão Geral Comercial</h2><p>Este é um dashboard de exemplo. Os gráficos abaixo se preenchem automaticamente conforme você cadastra <strong>empresas</strong>, <strong>pessoas</strong> e <strong>oportunidades</strong> no CRM. Arraste, redimensione ou edite cada widget — ou crie o seu do zero.</p>`,
);

const MARKETING_INTRO = richText(
  `<h2>📈 Marketing & Captação</h2><p>Dashboard de exemplo que reúne suas iniciativas de aquisição. Os gráficos se preenchem conforme você publica <strong>landing pages</strong>, recebe respostas de <strong>formulários</strong> e conecta suas <strong>redes sociais</strong>.</p>`,
);

export const SEED_DASHBOARDS: SeedDashboard[] = [
  {
    title: "Visão Geral Comercial",
    widgets: [
      { type: "RICH_TEXT", x: 0, y: 0, w: 12, h: 3, config: COMMERCIAL_INTRO },
      {
        type: "CHART",
        x: 0,
        y: 3,
        w: 4,
        h: 5,
        config: chart({
          chartType: "aggregate",
          source: "opportunities",
          yField: "amount",
          prefix: "R$ ",
          xAxisName: "Pipeline total",
        }),
      },
      {
        type: "CHART",
        x: 4,
        y: 3,
        w: 8,
        h: 5,
        config: chart({
          chartType: "vertical",
          source: "opportunities",
          xField: "stage",
          xAxisName: "Estágio",
          yAxisName: "Oportunidades",
        }),
      },
      {
        type: "CHART",
        x: 0,
        y: 8,
        w: 4,
        h: 6,
        config: chart({
          chartType: "pie",
          source: "companies",
          xField: "icp",
        }),
      },
      {
        type: "VIEW",
        x: 4,
        y: 8,
        w: 8,
        h: 6,
        config: view({
          source: "tasks",
          fields: ["title", "status", "dueDate"],
        }),
      },
    ],
  },
  {
    title: "Marketing & Captação",
    widgets: [
      { type: "RICH_TEXT", x: 0, y: 0, w: 12, h: 3, config: MARKETING_INTRO },
      {
        type: "CHART",
        x: 0,
        y: 3,
        w: 6,
        h: 6,
        config: chart({
          chartType: "line",
          source: "page-views",
          xField: "createdAt",
          xAxisName: "Data",
          yAxisName: "Acessos",
        }),
      },
      {
        type: "CHART",
        x: 6,
        y: 3,
        w: 6,
        h: 6,
        config: chart({
          chartType: "line",
          source: "form-submissions",
          xField: "createdAt",
          xAxisName: "Data",
          yAxisName: "Respostas",
        }),
      },
      {
        type: "VIEW",
        x: 0,
        y: 9,
        w: 8,
        h: 6,
        config: view({
          source: "forms",
          fields: ["name", "action", "status", "submissionCount"],
        }),
      },
      {
        type: "CHART",
        x: 8,
        y: 9,
        w: 4,
        h: 6,
        config: chart({
          chartType: "line",
          source: "socials",
          yField: "views",
          platforms: ["INSTAGRAM"],
        }),
      },
    ],
  },
];
