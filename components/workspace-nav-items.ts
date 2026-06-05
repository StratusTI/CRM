import {
  AnalyticsUpIcon,
  BrowserIcon,
  Building03Icon,
  Calendar01Icon,
  ChartHistogramIcon,
  CheckListIcon,
  DashboardSquare01Icon,
  DocumentValidationIcon,
  Facebook01Icon,
  GoogleIcon,
  InstagramIcon,
  Linkedin01Icon,
  Mail01Icon,
  MailSend01Icon,
  Megaphone01Icon,
  MegaphoneIcon,
  NewTwitterIcon,
  PackageIcon,
  Settings02Icon,
  Share08Icon,
  StickyNote01Icon,
  TargetDollarIcon,
  TaskDone01Icon,
  TiktokIcon,
  UserGroup02Icon,
  UserMultipleIcon,
  UserSearch01Icon,
  WorkflowCircle01Icon,
  YoutubeIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export type NavLeaf = {
  title: string;
  /** Caminho relativo ao workspace, ex.: "companies" ou "social/instagram". */
  segment: string;
  icon: IconSvgElement;
  /** Classe de cor de fundo do quadrado do ícone. */
  color: string;
};

export type NavNode = NavLeaf & { children?: NavLeaf[] };

export const WORKSPACE_NAV: NavNode[] = [
  {
    title: "Empresas",
    segment: "companies",
    icon: Building03Icon,
    color: "bg-blue-500",
  },
  {
    title: "Pessoas",
    segment: "people",
    icon: UserMultipleIcon,
    color: "bg-emerald-500",
  },
  {
    title: "Leads",
    segment: "leads",
    icon: UserSearch01Icon,
    color: "bg-pink-500",
  },
  {
    title: "Oportunidades",
    segment: "opportunities",
    icon: TargetDollarIcon,
    color: "bg-amber-500",
  },
  {
    title: "Produtos",
    segment: "products",
    icon: PackageIcon,
    color: "bg-orange-500",
  },
  {
    title: "Previsão",
    segment: "forecast",
    icon: AnalyticsUpIcon,
    color: "bg-cyan-500",
  },
  {
    title: "Tarefas",
    segment: "tasks",
    icon: TaskDone01Icon,
    color: "bg-violet-500",
  },
  {
    title: "Calendário",
    segment: "tasks/calendar",
    icon: Calendar01Icon,
    color: "bg-violet-400",
  },
  {
    title: "Notas",
    segment: "notes",
    icon: StickyNote01Icon,
    color: "bg-rose-500",
  },
  {
    title: "Documentos",
    segment: "proposals",
    icon: DocumentValidationIcon,
    color: "bg-teal-500",
  },
  {
    title: "Formulários",
    segment: "forms",
    icon: CheckListIcon,
    color: "bg-fuchsia-500",
  },
  {
    title: "Painéis",
    segment: "dashboards",
    icon: DashboardSquare01Icon,
    color: "bg-cyan-500",
  },
  {
    title: "Relatórios",
    segment: "reports",
    icon: ChartHistogramIcon,
    color: "bg-teal-600",
  },
  {
    title: "Workflows",
    segment: "workflows",
    icon: WorkflowCircle01Icon,
    color: "bg-indigo-500",
  },
  {
    title: "Marketing",
    segment: "marketing",
    icon: MegaphoneIcon,
    color: "bg-orange-500",
    children: [
      {
        title: "Campanhas",
        segment: "marketing/campaigns",
        icon: MailSend01Icon,
        color: "bg-orange-500",
      },
      {
        title: "Templates",
        segment: "marketing/templates",
        icon: Mail01Icon,
        color: "bg-amber-500",
      },
      {
        title: "Listas",
        segment: "marketing/mailing-lists",
        icon: UserGroup02Icon,
        color: "bg-rose-500",
      },
      {
        title: "Páginas",
        segment: "marketing/pages",
        icon: BrowserIcon,
        color: "bg-orange-400",
      },
    ],
  },
  {
    title: "Social",
    segment: "social",
    icon: Share08Icon,
    color: "bg-fuchsia-500",
    children: [
      {
        title: "Agendar posts",
        segment: "social/scheduled",
        icon: Calendar01Icon,
        color: "bg-fuchsia-500",
      },
      {
        title: "Instagram",
        segment: "social/instagram",
        icon: InstagramIcon,
        color: "bg-pink-500",
      },
      {
        title: "Facebook",
        segment: "social/facebook",
        icon: Facebook01Icon,
        color: "bg-blue-600",
      },
      {
        title: "TikTok",
        segment: "social/tiktok",
        icon: TiktokIcon,
        color: "bg-neutral-900",
      },
      {
        title: "YouTube",
        segment: "social/youtube",
        icon: YoutubeIcon,
        color: "bg-red-600",
      },
      {
        title: "Google Analytics",
        segment: "social/google_analytics",
        icon: GoogleIcon,
        color: "bg-orange-500",
      },
      {
        title: "X (Twitter)",
        segment: "social/twitter",
        icon: NewTwitterIcon,
        color: "bg-neutral-900",
      },
      {
        title: "LinkedIn",
        segment: "social/linkedin",
        icon: Linkedin01Icon,
        color: "bg-blue-700",
      },
      {
        title: "Google Ads",
        segment: "social/google_ads",
        icon: Megaphone01Icon,
        color: "bg-blue-500",
      },
    ],
  },
];

export const OTHER_NAV: NavNode[] = [
  {
    title: "Configurações",
    segment: "settings",
    icon: Settings02Icon,
    color: "bg-neutral-500",
  },
];

/** Todas as folhas navegáveis (inclui filhos do Social), sem os pais-grupo. */
export const NAV_LEAVES: NavLeaf[] = [...WORKSPACE_NAV, ...OTHER_NAV].flatMap(
  (node) => (node.children ? node.children : [node]),
);

/** Acha a folha de navegação cujo segmento corresponde ao caminho do recurso. */
export function findNavLeaf(resourcePath: string): NavLeaf | undefined {
  return (
    NAV_LEAVES.find((leaf) => leaf.segment === resourcePath) ??
    [...WORKSPACE_NAV, ...OTHER_NAV].find((n) => n.segment === resourcePath)
  );
}
