import { ok, type Result } from "@/src/lib/result";
import type { TrendingItem } from "@/src/schemas/social-trending.schema";
import { InstagramService } from "@/src/services/instagram.service";
import { TiktokService } from "@/src/services/tiktok.service";

const HOUR_MS = 3_600_000;

function hoursSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return Math.max(1, (Date.now() - t) / HOUR_MS);
}

function isToday(iso: string): boolean {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return false;
  const now = new Date();
  return (
    t.getFullYear() === now.getFullYear() &&
    t.getMonth() === now.getMonth() &&
    t.getDate() === now.getDate()
  );
}

async function tiktokToday(
  userId: string,
  slug: string,
): Promise<TrendingItem[]> {
  const result = await TiktokService.getVideos(userId, slug).catch(() => null);
  if (!result || !result.ok) return [];

  return result.value.videos
    .filter((v) => v.createdAt && isToday(v.createdAt))
    .map((v) => {
      const interactions = v.likeCount + v.commentCount + v.shareCount;
      return {
        id: v.id,
        platform: "TIKTOK" as const,
        thumbnailUrl: v.coverImageUrl,
        caption: v.title || null,
        permalink: v.shareUrl,
        postedAt: v.createdAt,
        views: v.viewCount,
        likes: v.likeCount,
        comments: v.commentCount,
        shares: v.shareCount,
        saved: null,
        score: (v.viewCount + interactions) / hoursSince(v.createdAt),
      };
    });
}

async function instagramToday(
  userId: string,
  slug: string,
): Promise<TrendingItem[]> {
  const result = await InstagramService.getTodayMediaEngagement(
    userId,
    slug,
  ).catch(() => null);
  if (!result || !result.ok) return [];

  return result.value
    .filter((m) => isToday(m.timestamp))
    .map((m) => {
      const interactions = m.likeCount + m.commentsCount + m.saved;
      return {
        id: m.id,
        platform: "INSTAGRAM" as const,
        thumbnailUrl: m.mediaType === "VIDEO" ? m.thumbnailUrl : m.mediaUrl,
        caption: m.caption,
        permalink: m.permalink,
        postedAt: m.timestamp,
        views: null,
        likes: m.likeCount,
        comments: m.commentsCount,
        shares: null,
        saved: m.saved,
        score: interactions / hoursSince(m.timestamp),
      };
    });
}

export const SocialTrendingService = {
  /**
   * Ranking dos posts de hoje (TikTok + Instagram) por velocidade de
   * engajamento: `(views + interações) / horas desde a publicação`. Contas
   * não conectadas ou com erro contribuem lista vazia — não derruba o
   * ranking das demais.
   */
  async getTodayRanking(
    userId: string,
    slug: string,
  ): Promise<Result<TrendingItem[]>> {
    const [tiktok, instagram] = await Promise.all([
      tiktokToday(userId, slug),
      instagramToday(userId, slug),
    ]);

    const items = [...tiktok, ...instagram].sort((a, b) => b.score - a.score);
    return ok(items);
  },
};
