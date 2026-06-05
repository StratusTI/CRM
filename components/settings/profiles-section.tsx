"use client";

import {
  Delete02Icon,
  PencilEdit02Icon,
  PlusSignIcon,
  SecurityCheckIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PERMISSION_ACTIONS,
  PERMISSION_RESOURCES,
  type PermissionAction,
} from "@/src/lib/permissions";
import {
  createProfile,
  deleteProfile,
  updateProfile,
  useProfiles,
} from "@/src/hooks/use-profiles";
import type { ProfileDTO } from "@/src/schemas/profile.schema";

const RESOURCE_LABELS: Record<string, string> = {
  companies: "Empresas",
  people: "Pessoas",
  opportunities: "Oportunidades",
  products: "Produtos",
  pipelines: "Funis",
  quotas: "Metas",
  "custom-fields": "Campos custom.",
  tasks: "Tarefas",
  notes: "Notas",
  documents: "Documentos",
  forms: "Formulários",
  "landing-pages": "Landing pages",
  email: "E-mail mkt",
  dashboards: "Dashboards",
  workflows: "Automações",
  social: "Redes sociais",
  integrations: "Integrações",
  members: "Membros/Perfis",
  settings: "Configurações",
};

const ACTION_LABELS: Record<PermissionAction, string> = {
  VIEW: "Ver",
  CREATE: "Criar",
  EDIT: "Editar",
  DELETE: "Excluir",
};

type Matrix = Record<string, PermissionAction[]>;

export function ProfilesSection({
  slug,
  canManage,
}: {
  slug: string;
  canManage: boolean;
}) {
  const { profiles, isLoading, refetch } = useProfiles(slug);

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-heading font-semibold text-lg tracking-tight">
            Perfis de acesso
          </h2>
          <p className="text-muted-foreground text-sm">
            Defina o que cada perfil pode ver, criar, editar e excluir. Atribua
            perfis aos membros na seção acima.
          </p>
        </div>
        {canManage ? (
          <ProfileDialog
            slug={slug}
            onSaved={refetch}
            trigger={
              <Button size="sm">
                <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
                Novo perfil
              </Button>
            }
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        {isLoading ? (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        ) : (
          profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              slug={slug}
              profile={profile}
              canManage={canManage}
              onChanged={refetch}
            />
          ))
        )}
      </div>
    </section>
  );
}

function ProfileCard({
  slug,
  profile,
  canManage,
  onChanged,
}: {
  slug: string;
  profile: ProfileDTO;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [removing, setRemoving] = useState(false);

  async function handleDelete() {
    setRemoving(true);
    const result = await deleteProfile(slug, profile.id);
    setRemoving(false);
    if (result.ok) {
      toast.success("Perfil excluído.");
      onChanged();
    } else {
      toast.error(result.message ?? "Não foi possível excluir o perfil.");
    }
  }

  const grantedCount = Object.values(profile.permissions).reduce(
    (sum, actions) => sum + actions.length,
    0,
  );

  return (
    <Card
      size="sm"
      className="flex-row items-center justify-between gap-4 px-4 py-3"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <HugeiconsIcon icon={SecurityCheckIcon} className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate font-medium text-sm">
            {profile.name}
            {profile.isSystem ? (
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
                sistema
              </span>
            ) : null}
          </p>
          <p className="truncate text-muted-foreground text-xs">
            {grantedCount} permissões concedidas
          </p>
        </div>
      </div>
      {canManage && !profile.isSystem ? (
        <div className="flex shrink-0 items-center gap-1">
          <ProfileDialog
            slug={slug}
            profile={profile}
            onSaved={onChanged}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Editar perfil">
                <HugeiconsIcon icon={PencilEdit02Icon} className="size-4" />
              </Button>
            }
          />
          <Dialog>
            <DialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Excluir perfil"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Excluir “{profile.name}”?</DialogTitle>
                <DialogDescription>
                  Só é possível excluir um perfil sem membros atribuídos.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancelar
                </DialogClose>
                <DialogClose
                  render={
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={removing}
                    />
                  }
                >
                  Excluir
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}
    </Card>
  );
}

function ProfileDialog({
  slug,
  profile,
  trigger,
  onSaved,
}: {
  slug: string;
  profile?: ProfileDTO;
  trigger: React.ReactNode;
  onSaved: () => void;
}) {
  const isEdit = Boolean(profile);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(profile?.name ?? "");
  const [matrix, setMatrix] = useState<Matrix>(
    () => (profile?.permissions as Matrix) ?? {},
  );

  function reset() {
    setName(profile?.name ?? "");
    setMatrix((profile?.permissions as Matrix) ?? {});
  }

  function toggle(resource: string, action: PermissionAction) {
    setMatrix((prev) => {
      const current = prev[resource] ?? [];
      const has = current.includes(action);
      return {
        ...prev,
        [resource]: has
          ? current.filter((a) => a !== action)
          : [...current, action],
      };
    });
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Informe o nome do perfil.");
      return;
    }
    const permissions: Matrix = {};
    for (const [resource, actions] of Object.entries(matrix)) {
      if (actions.length > 0) permissions[resource] = actions;
    }

    setSaving(true);
    const result =
      isEdit && profile
        ? await updateProfile(slug, profile.id, { name: trimmed, permissions })
        : await createProfile(slug, { name: trimmed, permissions });
    setSaving(false);

    if (result.ok) {
      toast.success(isEdit ? "Perfil atualizado." : "Perfil criado.");
      setOpen(false);
      onSaved();
    } else {
      toast.error(result.message ?? "Não foi possível salvar o perfil.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar perfil" : "Novo perfil"}</DialogTitle>
          <DialogDescription>
            Marque as ações permitidas para cada recurso.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-name">Nome</Label>
            <Input
              id="profile-name"
              value={name}
              placeholder="Somente leitura"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-xs">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Recurso</th>
                  {PERMISSION_ACTIONS.map((a) => (
                    <th key={a} className="px-2 py-2 text-center font-medium">
                      {ACTION_LABELS[a]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_RESOURCES.map((resource) => (
                  <tr key={resource} className="border-t">
                    <td className="px-3 py-1.5">
                      {RESOURCE_LABELS[resource] ?? resource}
                    </td>
                    {PERMISSION_ACTIONS.map((action) => (
                      <td key={action} className="px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={
                            matrix[resource]?.includes(action) ?? false
                          }
                          onChange={() => toggle(resource, action)}
                          className="size-4 accent-indigo-500"
                          aria-label={`${resource} ${action}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button onClick={handleSave} disabled={saving}>
            {isEdit ? "Salvar" : "Criar perfil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
