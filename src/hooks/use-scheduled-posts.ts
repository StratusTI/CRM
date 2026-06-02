"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";
import type {
  PublishablePlatform,
  ScheduledPostDTO,
  ScheduledPostOptions,
} from "@/src/schemas/scheduled-post.schema";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

export type CreateScheduledPostArgs = {
  platforms: PublishablePlatform[];
  content: string;
  title?: string;
  mode: "now" | "schedule";
  /** ISO 8601; obrigatório quando `mode = "schedule"`. */
  scheduledFor?: string;
  options?: ScheduledPostOptions;
  files: File[];
};

/** Posts agendados do workspace: lista + criar/cancelar/reagendar. */
export function useScheduledPosts(slug: string) {
  const [posts, setPosts] = useState<ScheduledPostDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        apiUrl(`/api/workspaces/${slug}/social/scheduled-posts`),
      );
      const json = (await res.json()) as ApiResponse<ScheduledPostDTO[]>;
      if (!res.ok || !json.success || !json.data) {
        setError(json.message ?? "Não foi possível carregar os posts.");
        return;
      }
      setPosts(json.data);
    } catch {
      setError("Erro de rede.");
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(
    async (
      args: CreateScheduledPostArgs,
    ): Promise<{ ok: boolean; message?: string; data?: ScheduledPostDTO }> => {
      const form = new FormData();
      form.set("platforms", JSON.stringify(args.platforms));
      form.set("content", args.content);
      if (args.title) form.set("title", args.title);
      form.set("mode", args.mode);
      if (args.scheduledFor) form.set("scheduledFor", args.scheduledFor);
      if (args.options) form.set("options", JSON.stringify(args.options));
      for (const file of args.files) form.append("media", file);

      try {
        const res = await fetch(
          apiUrl(`/api/workspaces/${slug}/social/scheduled-posts`),
          { method: "POST", body: form },
        );
        const json = (await res.json()) as ApiResponse<ScheduledPostDTO>;
        if (!res.ok || !json.success || !json.data) {
          return { ok: false, message: json.message ?? "Falha ao salvar." };
        }
        await refetch();
        return { ok: true, data: json.data };
      } catch {
        return { ok: false, message: "Erro de rede." };
      }
    },
    [slug, refetch],
  );

  const cancel = useCallback(
    async (id: string): Promise<{ ok: boolean; message?: string }> => {
      try {
        const res = await fetch(
          apiUrl(`/api/workspaces/${slug}/social/scheduled-posts/${id}`),
          { method: "DELETE" },
        );
        const json = (await res.json()) as ApiResponse<unknown>;
        if (!res.ok || !json.success) {
          return { ok: false, message: json.message };
        }
        await refetch();
        return { ok: true };
      } catch {
        return { ok: false, message: "Erro de rede." };
      }
    },
    [slug, refetch],
  );

  const reschedule = useCallback(
    async (
      id: string,
      scheduledFor: string,
    ): Promise<{ ok: boolean; message?: string }> => {
      try {
        const res = await fetch(
          apiUrl(`/api/workspaces/${slug}/social/scheduled-posts/${id}`),
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scheduledFor }),
          },
        );
        const json = (await res.json()) as ApiResponse<unknown>;
        if (!res.ok || !json.success) {
          return { ok: false, message: json.message };
        }
        await refetch();
        return { ok: true };
      } catch {
        return { ok: false, message: "Erro de rede." };
      }
    },
    [slug, refetch],
  );

  return { posts, isLoading, error, refetch, create, cancel, reschedule };
}
