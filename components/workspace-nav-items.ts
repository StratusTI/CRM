import {
  Building03Icon,
  DashboardSquare01Icon,
  Facebook01Icon,
  GoogleIcon,
  InstagramIcon,
  Mail01Icon,
  MailSend01Icon,
  MegaphoneIcon,
  NewTwitterIcon,
  Settings02Icon,
  Share08Icon,
  StickyNote01Icon,
  TargetDollarIcon,
  TaskDone01Icon,
  TiktokIcon,
  UserMultipleIcon,
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
    title: "Oportunidades",
    segment: "opportunities",
    icon: TargetDollarIcon,
    color: "bg-amber-500",
  },
  {
    title: "Tarefas",
    segment: "tasks",
    icon: TaskDone01Icon,
    color: "bg-violet-500",
  },
  {
    title: "Notas",
    segment: "notes",
    icon: StickyNote01Icon,
    color: "bg-rose-500",
  },
  {
    title: "Painéis",
    segment: "dashboards",
    icon: DashboardSquare01Icon,
    color: "bg-cyan-500",
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
    ],
  },
  {
    title: "Social",
    segment: "social",
    icon: Share08Icon,
    color: "bg-fuchsia-500",
    children: [
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
