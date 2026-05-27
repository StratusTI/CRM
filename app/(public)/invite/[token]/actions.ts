"use server";

import { redirect } from "next/navigation";
import { withBasePath } from "@/lib/api-url";
import { getAuthSession } from "@/src/lib/auth-session";
import {
  clearPendingInvite,
  stashPendingInvite,
} from "@/src/lib/pending-invite";
import { WorkspaceInviteService } from "@/src/services/workspace-invite.service";

/** Grava o token na cookie e manda pro sign-in. */
export async function stashAndGoToSignIn(token: string): Promise<void> {
  await stashPendingInvite(token);
  redirect(withBasePath("/sign-in"));
}

/** Grava o token na cookie e manda pro sign-up. */
export async function stashAndGoToSignUp(token: string): Promise<void> {
  await stashPendingInvite(token);
  redirect(withBasePath("/sign-up"));
}

/**
 * Aceita o convite. Exige sessão. Em sucesso redireciona para a home da
 * workspace (`/<slug>/companies` é o destino padrão configurado no proxy).
 */
export async function acceptInvite(token: string): Promise<void> {
  const session = await getAuthSession();
  if (!session.ok) {
    await stashPendingInvite(token);
    redirect(withBasePath("/sign-in"));
  }

  const result = await WorkspaceInviteService.accept(
    session.value.user.id,
    token,
  );

  if (!result.ok) {
    // Já é membro: manda pra workspace direto.
    if (result.error.code === "WORKSPACE_ALREADY_MEMBER") {
      // Sem o slug aqui — usa o lookup público pra resolver.
      const pub = await WorkspaceInviteService.getPublicByToken(token);
      if (pub.ok) redirect(withBasePath(`/${pub.value.workspaceSlug}`));
    }
    // Outras falhas (desativado, inválido) caem na própria página, que vai
    // re-renderizar o estado de erro.
    return;
  }

  await clearPendingInvite();
  redirect(withBasePath(`/${result.value.slug}`));
}
