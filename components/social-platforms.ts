import {
  Facebook01Icon,
  GoogleIcon,
  InstagramIcon,
  NewTwitterIcon,
  TiktokIcon,
  YoutubeIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type { SocialPlatform } from "@/src/schemas/social-connection.schema";

export type SocialPlatformMeta = {
  platform: SocialPlatform;
  /** Slug minúsculo usado nas rotas/URLs. */
  slug: string;
  label: string;
  icon: IconSvgElement;
  /** Classe de cor de fundo do quadrado do ícone. */
  color: string;
};

/** Metadados das plataformas suportadas — fonte única para UI e navegação. */
export const SOCIAL_PLATFORM_META: SocialPlatformMeta[] = [
  {
    platform: "INSTAGRAM",
    slug: "instagram",
    label: "Instagram",
    icon: InstagramIcon,
    color: "bg-pink-500",
  },
  {
    platform: "FACEBOOK",
    slug: "facebook",
    label: "Facebook",
    icon: Facebook01Icon,
    color: "bg-blue-600",
  },
  {
    platform: "TIKTOK",
    slug: "tiktok",
    label: "TikTok",
    icon: TiktokIcon,
    color: "bg-neutral-900",
  },
  {
    platform: "YOUTUBE",
    slug: "youtube",
    label: "YouTube",
    icon: YoutubeIcon,
    color: "bg-red-600",
  },
  {
    platform: "GOOGLE_ANALYTICS",
    slug: "google_analytics",
    label: "Google Analytics",
    icon: GoogleIcon,
    color: "bg-orange-500",
  },
  {
    platform: "TWITTER",
    slug: "twitter",
    label: "X (Twitter)",
    icon: NewTwitterIcon,
    color: "bg-neutral-900",
  },
];
