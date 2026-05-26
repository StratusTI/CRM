"use client";

import {
  Copy01Icon,
  RefreshIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useWorkspaceInvite } from "@/src/hooks/use-workspace-invite";

type Member = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

const ROLE_LABEL: Record<Member["role"], string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MEMBER: "Membro",
};

export function WorkspaceMembersSection({
  slug,
  currentUserRole,
}: {
  slug: string;
  currentUserRole: Member["role"];
}) {
  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  const refetchMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const response = await fetch(`/api/workspaces/${slug}/members`);
      const json = await response.json();
      if (response.ok && json.success && Array.isArray(json.data)) {
        setMembers(json.data as Member[]);
      }
    } finally {
      setMembersLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    refetchMembers();
  }, [refetchMembers]);

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 space-y-1">
        <h2 className="font-heading font-semibold text-lg tracking-tight">
          Membros
        </h2>
        <p className="text-muted-foreground text-sm">
          Quem tem acesso a este workspace e como convidar novos membros.
        </p>
      </div>

      {canManage ? (
        <InviteLinkBlock slug={slug} onChanged={refetchMembers} />
      ) : null}

      <div className="mt-6 flex flex-col gap-2">
        {membersLoading ? (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        ) : (
          members.map((member) => (
            <Card
              key={member.id}
              size="sm"
              className="flex-row items-center justify-between gap-4 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <HugeiconsIcon icon={UserMultipleIcon} className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">{member.name}</p>
                  <p className="truncate text-muted-foreground text-xs">
                    {member.email}
                  </p>
                </div>
              </div>
              <span className="text-muted-foreground text-xs">
                {ROLE_LABEL[member.role]}
              </span>
            </Card>
          ))
        )}
      </div>
    </section>
  );
}

function InviteLinkBlock({
  slug,
  onChanged,
}: {
  slug: string;
  onChanged: () => void;
}) {
  const { invite, isLoading, update } = useWorkspaceInvite(slug);
  const [working, setWorking] = useState(false);

  async function handleCopy() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.url);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  async function handleToggleActive(checked: boolean) {
    setWorking(true);
    const result = await update({ isActive: checked });
    setWorking(false);
    if (result.ok) {
      toast.success(checked ? "Link ativado." : "Link desativado.");
    } else {
      toast.error(result.message ?? "Não foi possível atualizar o link.");
    }
  }

  async function handleRoleChange(role: "MEMBER" | "ADMIN") {
    setWorking(true);
    const result = await update({ role });
    setWorking(false);
    if (result.ok) {
      toast.success("Permissão do convite atualizada.");
    } else {
      toast.error(result.message ?? "Não foi possível atualizar a permissão.");
    }
  }

  async function handleRegenerate() {
    setWorking(true);
    const result = await update({ regenerate: true });
    setWorking(false);
    if (result.ok) {
      toast.success("Novo link gerado. O anterior foi invalidado.");
      onChanged();
    } else {
      toast.error(result.message ?? "Não foi possível gerar um novo link.");
    }
  }

  if (isLoading || !invite) {
    return (
      <Card className="flex flex-col gap-3 p-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-full" />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-sm">Link de convite</p>
          <p className="text-muted-foreground text-xs">
            Qualquer pessoa com este link pode entrar como{" "}
            <strong>
              {invite.role === "ADMIN" ? "Administrador" : "Membro"}
            </strong>
            .
          </p>
        </div>
        <Switch
          checked={invite.isActive}
          disabled={working}
          onCheckedChange={(checked) => handleToggleActive(checked === true)}
          aria-label="Ativar link de convite"
        />
      </div>

      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={invite.isActive ? invite.url : "Link desativado"}
          className="font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={!invite.isActive || working}
        >
          <HugeiconsIcon icon={Copy01Icon} className="size-4" />
          Copiar
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Permissão:</span>
          <Select
            value={invite.role}
            onValueChange={(value) =>
              handleRoleChange(value as "MEMBER" | "ADMIN")
            }
            disabled={working}
          >
            <SelectTrigger size="sm" className="w-36">
              <span>
                {invite.role === "ADMIN" ? "Administrador" : "Membro"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MEMBER">Membro</SelectItem>
              <SelectItem value="ADMIN">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog>
          <DialogTrigger
            render={
              <Button variant="ghost" size="sm" disabled={working}>
                <HugeiconsIcon icon={RefreshIcon} className="size-4" />
                Gerar novo link
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar um novo link?</DialogTitle>
              <DialogDescription>
                O link atual será invalidado imediatamente. Pessoas que
                receberam o link antigo precisarão receber o novo.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancelar
              </DialogClose>
              <DialogClose
                render={
                  <Button onClick={handleRegenerate} disabled={working} />
                }
              >
                Gerar novo link
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}
