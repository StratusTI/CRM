import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getAuthSession } from "@/src/lib/auth-session";
import { MembershipRepository } from "@/src/repositories/membership.repository";
import { WorkspaceInviteService } from "@/src/services/workspace-invite.service";
import {
  acceptInvite,
  stashAndGoToSignIn,
  stashAndGoToSignUp,
} from "./actions";

type PageProps = {
  params: Promise<{ token: string }>;
};

const ROLE_LABEL: Record<"MEMBER" | "ADMIN", string> = {
  MEMBER: "Membro",
  ADMIN: "Administrador",
};

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;
  const result = await WorkspaceInviteService.getPublicByToken(token);

  if (!result.ok) {
    return (
      <AuthShell>
        <Card>
          <CardHeader>
            <CardTitle>Convite indisponível</CardTitle>
            <CardDescription>
              Este link pode ter sido desativado ou regenerado. Peça um novo
              link para quem administra o workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Ir para a Home
            </Link>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  const invite = result.value;
  const session = await getAuthSession();
  const userId = session.ok ? session.value.user.id : null;

  // Já é membro? Mostra um caminho direto pra workspace.
  if (userId) {
    const existing = await MembershipRepository.findByUserAndSlug(
      userId,
      invite.workspaceSlug,
    );
    if (existing.ok && existing.value) {
      return (
        <AuthShell tagline={`Você já faz parte de ${invite.workspaceName}.`}>
          <Card>
            <CardHeader>
              <CardTitle>Você já é membro</CardTitle>
              <CardDescription>
                Não é preciso aceitar este convite — sua conta já tem acesso ao
                workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={`/${invite.workspaceSlug}`}
                className={cn(buttonVariants(), "w-full")}
              >
                Ir para {invite.workspaceName}
              </Link>
            </CardContent>
          </Card>
        </AuthShell>
      );
    }
  }

  if (userId) {
    return (
      <AuthShell tagline={`Você foi convidado para ${invite.workspaceName}.`}>
        <Card>
          <CardHeader>
            <CardTitle>Aceitar convite</CardTitle>
            <CardDescription>
              Você entrará como <strong>{ROLE_LABEL[invite.role]}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <form action={acceptInvite.bind(null, token)}>
              <Button type="submit" className="w-full">
                Aceitar convite
              </Button>
            </form>
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Agora não
            </Link>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell tagline={`Você foi convidado para ${invite.workspaceName}.`}>
      <Card>
        <CardHeader>
          <CardTitle>Entre para aceitar</CardTitle>
          <CardDescription>
            Faça login ou crie sua conta para entrar como{" "}
            <strong>{ROLE_LABEL[invite.role]}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <form action={stashAndGoToSignIn.bind(null, token)}>
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>
          <form action={stashAndGoToSignUp.bind(null, token)}>
            <Button type="submit" variant="outline" className="w-full">
              Criar conta
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
