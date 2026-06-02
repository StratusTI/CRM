import { ScheduledPostRepository } from "@/src/repositories/scheduled-post.repository";
import { publishScheduledPost } from "@/src/services/scheduled-post.service";

/**
 * Tick do agendador de posts — chamado por um cron externo (1x por minuto, ver
 * `/api/cron/social-posts-tick`). Busca posts SCHEDULED já vencidos, "reivindica"
 * cada um de forma atômica (SCHEDULED→PUBLISHING) e publica. O claim garante
 * idempotência: se dois ticks rodarem juntos, só um publica cada post.
 *
 * Não lança: cada falha de post fica registrada no próprio post/alvo.
 */
export async function socialPostSchedulerTick(now = new Date()): Promise<{
  considered: number;
  dispatched: number;
  errors: number;
}> {
  let considered = 0;
  let dispatched = 0;
  let errors = 0;

  const due = await ScheduledPostRepository.findDue(now);
  if (!due.ok) return { considered: 0, dispatched: 0, errors: 1 };

  for (const post of due.value) {
    considered++;

    const claimed = await ScheduledPostRepository.claim(post.id);
    if (!claimed.ok) {
      errors++;
      continue;
    }
    // Outro tick concorrente já assumiu este post — pula.
    if (!claimed.value) continue;

    try {
      await publishScheduledPost(post);
      dispatched++;
    } catch {
      errors++;
      await ScheduledPostRepository.updateStatus(post.id, "FAILED", {
        lastError: "Erro inesperado ao publicar",
      });
    }
  }

  return { considered, dispatched, errors };
}
