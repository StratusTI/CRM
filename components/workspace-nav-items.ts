import {
  Building03Icon,
  DashboardSquare01Icon,
  Facebook01Icon,
  InstagramIcon,
  Settings02Icon,
  Share08Icon,
  StickyNote01Icon,
  TargetDollarIcon,
  TaskDone01Icon,
  TiktokIcon,
  UserMultipleIcon,
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
    title: "Companies",
    segment: "companies",
    icon: Building03Icon,
    color: "bg-blue-500",
  },
  {
    title: "People",
    segment: "people",
    icon: UserMultipleIcon,
    color: "bg-emerald-500",
  },
  {
    title: "Opportunities",
    segment: "opportunities",
    icon: TargetDollarIcon,
    color: "bg-amber-500",
  },
  {
    title: "Tasks",
    segment: "tasks",
    icon: TaskDone01Icon,
    color: "bg-violet-500",
  },
  {
    title: "Notes",
    segment: "notes",
    icon: StickyNote01Icon,
    color: "bg-rose-500",
  },
  {
    title: "Dashboards",
    segment: "dashboards",
    icon: DashboardSquare01Icon,
    color: "bg-cyan-500",
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
    ],
  },
];

export const OTHER_NAV: NavNode[] = [
  {
    title: "Settings",
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
