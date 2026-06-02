"use client";

import {
  Add01Icon,
  Cancel01Icon,
  Delete02Icon,
  PlusSignIcon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/api-url";
import { useResourceList } from "@/src/hooks/use-resource-list";
import { useWorkspaceLookups } from "@/src/hooks/use-workspace-lookups";
import type {
  MailingListDTO,
  MailingListMemberDTO,
  MailingListWithMembersDTO,
} from "@/src/schemas/mailing-list.schema";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COLUMNS: GridColumn[] = [
  {
    key: "name",
    header: "Nome",
    kind: "text",
    primary: true,
    readonly: true,
    placeholder: "—",
  },
  { key: "memberCount", header: "Membros", kind: "number", readonly: true },
  {
    key: "description",
    header: "Descrição",
    kind: "text",
    readonly: true,
    placeholder: "—",
  },
  { key: "createdAt", header: "Criada em", kind: "readonly-date" },
];

export function MailingListsList({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<MailingListDTO>(
    slug,
    "mailing-lists",
  );
  const { lookups } = useWorkspaceLookups(slug, []);
  const [viewing, setViewing] = useState<string | "new" | null>(null);

  return (
    <PageShell>
      <DataTable
        columns={COLUMNS}
        data={items}
        slug={slug}
        resource="mailing-lists"
        createTitle="lista"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Buscar listas…"
        refetch={refetch}
        disableInlineCreate
        headerAction={
          <Button size="sm" onClick={() => setViewing("new")}>
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
            Nova lista
          </Button>
        }
        onOpenRecord={(record) => setViewing(record.id)}
      />

      <MailingListSheet
        slug={slug}
        viewing={viewing}
        onClose={() => setViewing(null)}
        onSaved={() => {
          setViewing(null);
          refetch();
        }}
        onDeleted={() => {
          setViewing(null);
          refetch();
        }}
      />
    </PageShell>
  );
}

function MailingListSheet({
  slug,
  viewing,
  onClose,
  onSaved,
  onDeleted,
}: {
  slug: string;
  viewing: string | "new" | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const open = viewing !== null;
  const isNew = viewing === "new";

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex w-[560px] max-w-[560px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px] data-[side=right]:sm:max-w-[560px]"
      >
        {!open ? null : isNew ? (
          <CreateListPanel slug={slug} onClose={onClose} onSaved={onSaved} />
        ) : (
          <ListDetailPanel
            slug={slug}
            id={viewing as string}
            onClose={onClose}
            onDeleted={onDeleted}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function PanelHeader({
  onClose,
  title,
}: {
  onClose: () => void;
  title: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b p-3">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        aria-label="Fechar"
      >
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
      </Button>
      <SheetTitle className="truncate">{title}</SheetTitle>
    </div>
  );
}

function CreateListPanel({
  slug,
  onClose,
  onSaved,
}: {
  slug: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome da lista");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        apiUrl(`/api/workspaces/${slug}/mailing-lists`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
          }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message ?? "Erro ao criar lista");
        return;
      }
      toast.success("Lista criada");
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PanelHeader onClose={onClose} title="Nova lista de mailing" />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label className="text-muted-foreground text-xs">Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Clientes VIP"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-muted-foreground text-xs">
              Descrição (opcional)
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição da lista…"
              rows={2}
            />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 border-t p-3">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button onClick={onSubmit} disabled={submitting}>
          {submitting ? "Criando…" : "Criar lista"}
        </Button>
      </div>
    </>
  );
}

function ListDetailPanel({
  slug,
  id,
  onClose,
  onDeleted,
}: {
  slug: string;
  id: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [list, setList] = useState<MailingListWithMembersDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        apiUrl(`/api/workspaces/${slug}/mailing-lists/${id}`),
      );
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setList(json.data as MailingListWithMembersDTO);
      }
    } finally {
      setIsLoading(false);
    }
  }, [slug, id]);

  useEffect(() => {
    load();
  }, [load]);

  const addMember = async () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_RX.test(email)) {
      setAddError("Email inválido");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(
        apiUrl(`/api/workspaces/${slug}/mailing-lists/${id}/members`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            members: [{ email, name: nameInput.trim() || undefined }],
          }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message ?? "Erro ao adicionar membro");
        return;
      }
      setEmailInput("");
      setNameInput("");
      setAddError("");
      load();
    } finally {
      setAdding(false);
    }
  };

  const removeMember = async (memberId: string) => {
    const res = await fetch(
      apiUrl(
        `/api/workspaces/${slug}/mailing-lists/${id}/members/${memberId}`,
      ),
      { method: "DELETE" },
    );
    if (res.ok || res.status === 204) {
      load();
    } else {
      toast.error("Erro ao remover membro");
    }
  };

  const deleteList = async () => {
    setDeleting(true);
    try {
      const res = await fetch(
        apiUrl(`/api/workspaces/${slug}/mailing-lists/${id}`),
        { method: "DELETE" },
      );
      if (res.ok || res.status === 204) {
        toast.success("Lista removida");
        onDeleted();
      } else {
        toast.error("Erro ao remover lista");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PanelHeader
        onClose={onClose}
        title={isLoading ? "Carregando…" : (list?.name ?? "Lista")}
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-md bg-muted/40"
              />
            ))}
          </div>
        ) : !list ? (
          <p className="text-muted-foreground text-sm">Lista não encontrada.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {list.description ? (
              <p className="text-muted-foreground text-sm">{list.description}</p>
            ) : null}

            <div className="grid gap-1.5">
              <Label className="text-muted-foreground text-xs">
                Adicionar membro
              </Label>
              <div className="flex gap-2">
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Nome (opcional)"
                  className="w-36 shrink-0"
                />
                <div className="flex-1">
                  <Input
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      setAddError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addMember();
                      }
                    }}
                    placeholder="email@empresa.com"
                    type="email"
                  />
                  {addError ? (
                    <p className="mt-1 text-destructive text-xs">{addError}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMember}
                  disabled={adding}
                  className="shrink-0"
                >
                  <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                </Button>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-muted-foreground text-xs">
                Membros ({list.members.length})
              </Label>
              {list.members.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground text-xs">
                  Nenhum membro ainda. Adicione emails acima.
                </div>
              ) : (
                <MemberList members={list.members} onRemove={removeMember} />
              )}
            </div>
          </div>
        )}
      </div>

      {!isLoading && list && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={deleteList}
            disabled={deleting}
            className="text-muted-foreground hover:text-destructive"
          >
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="mr-1.5 size-4" />
            {deleting ? "Removendo…" : "Remover lista"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      )}
    </>
  );
}

function MemberList({
  members,
  onRemove,
}: {
  members: MailingListMemberDTO[];
  onRemove: (id: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = members.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      m.email.toLowerCase().includes(q) ||
      (m.name?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <HugeiconsIcon
          icon={UserAdd01Icon}
          strokeWidth={2}
          className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-4 text-muted-foreground"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar membro…"
          className="pl-9"
        />
      </div>
      <ul className="max-h-96 divide-y divide-border overflow-auto rounded-lg border border-border">
        {filtered.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              {m.name ? (
                <div className="truncate font-medium text-sm">{m.name}</div>
              ) : null}
              <div className="truncate text-muted-foreground text-xs">
                {m.email}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onRemove(m.id)}
              aria-label="Remover"
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
