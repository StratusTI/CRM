import {
  BarChartHorizontalIcon,
  BarChartIcon,
  Calculator01Icon,
  ChartLineData01Icon,
  GlobeIcon,
  PieChartIcon,
  PresentationBarChart01Icon,
  Table01Icon,
  TextFontIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type {
  ChartSource,
  ChartType,
  SocialMetric,
  ViewSource,
  WidgetType,
} from "@/src/schemas/dashboard-widget.schema";

export type WidgetTypeMeta = {
  type: WidgetType;
  label: string;
  description: string;
  icon: IconSvgElement;
};

export const WIDGET_TYPE_META: WidgetTypeMeta[] = [
  {
    type: "CHART",
    label: "Gráfico",
    description: "Gráficos de barras, linha, pizza ou agregação.",
    icon: PresentationBarChart01Icon,
  },
  {
    type: "VIEW",
    label: "Tabela",
    description: "Tabela de registros de uma fonte de dados.",
    icon: Table01Icon,
  },
  {
    type: "IFRAME",
    label: "Incorporar",
    description: "Incorpora uma página externa por URL.",
    icon: GlobeIcon,
  },
  {
    type: "RICH_TEXT",
    label: "Texto rico",
    description: "Texto formatado com o editor de blocos.",
    icon: TextFontIcon,
  },
];

export type ChartTypeMeta = {
  type: ChartType;
  label: string;
  icon: IconSvgElement;
};

/** Botões (só ícone + tooltip) do topo da customização de chart. */
export const CHART_TYPE_META: ChartTypeMeta[] = [
  { type: "vertical", label: "Barras verticais", icon: BarChartIcon },
  {
    type: "horizontal",
    label: "Barras horizontais",
    icon: BarChartHorizontalIcon,
  },
  { type: "line", label: "Linha", icon: ChartLineData01Icon },
  { type: "pie", label: "Pizza", icon: PieChartIcon },
  { type: "aggregate", label: "Agregação", icon: Calculator01Icon },
];

export type ViewField = { key: string; label: string };

/** Campos selecionáveis por fonte do widget "view" (chaves = campos do DTO). */
export const VIEW_SOURCE_FIELDS: Record<ViewSource, ViewField[]> = {
  companies: [
    { key: "name", label: "Nome" },
    { key: "domain", label: "Domínio" },
    { key: "employees", label: "Funcionários" },
    { key: "arr", label: "ARR" },
    { key: "icp", label: "ICP" },
    { key: "address", label: "Endereço" },
    { key: "createdAt", label: "Criado em" },
  ],
  people: [
    { key: "name", label: "Nome" },
    { key: "emails", label: "E-mails" },
    { key: "phones", label: "Telefones" },
    { key: "city", label: "Cidade" },
    { key: "jobTitle", label: "Cargo" },
    { key: "createdAt", label: "Criado em" },
  ],
  opportunities: [
    { key: "name", label: "Nome" },
    { key: "stage", label: "Estágio" },
    { key: "amount", label: "Valor" },
    { key: "closeDate", label: "Fechamento" },
    { key: "createdAt", label: "Criado em" },
  ],
  tasks: [
    { key: "title", label: "Título" },
    { key: "status", label: "Status" },
    { key: "dueDate", label: "Vencimento" },
    { key: "createdAt", label: "Criado em" },
  ],
  notes: [
    { key: "title", label: "Título" },
    { key: "body", label: "Conteúdo" },
    { key: "createdAt", label: "Criado em" },
  ],
};

export const VIEW_SOURCE_LABELS: Record<ViewSource, string> = {
  companies: "Empresas",
  people: "Pessoas",
  opportunities: "Oportunidades",
  tasks: "Tarefas",
  notes: "Notas",
};

/** Labels do chart: view sources + "socials". */
export const CHART_SOURCE_LABELS: Record<ChartSource, string> = {
  ...VIEW_SOURCE_LABELS,
  socials: "Redes sociais",
};

/** Rótulo PT-BR da métrica de socials usada no painel/legenda. */
export const SOCIAL_METRIC_LABELS: Record<SocialMetric, string> = {
  views: "Visualizações",
  followers: "Seguidores ganhos",
};
