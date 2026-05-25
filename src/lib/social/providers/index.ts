import type { SocialPlatform } from "@/src/schemas/social-connection.schema";
import { facebookProvider } from "./facebook";
import { googleAnalyticsProvider } from "./google-analytics";
import { instagramProvider } from "./instagram";
import { tiktokProvider } from "./tiktok";
import type { SocialProvider } from "./types";
import { youtubeProvider } from "./youtube";

/** Registry plataforma → provedor OAuth. */
const PROVIDERS: Record<SocialPlatform, SocialProvider> = {
  INSTAGRAM: instagramProvider,
  FACEBOOK: facebookProvider,
  TIKTOK: tiktokProvider,
  YOUTUBE: youtubeProvider,
  GOOGLE_ANALYTICS: googleAnalyticsProvider,
};

/** Provedor de uma plataforma (sempre existe — o enum é fechado). */
export function getProvider(platform: SocialPlatform): SocialProvider {
  return PROVIDERS[platform];
}

export type { SocialAccount, SocialProvider, TokenSet } from "./types";
