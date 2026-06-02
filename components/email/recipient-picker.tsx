"use client";

import { Add01Icon, Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api-url";
import type { PersonDTO } from "@/src/schemas/person.schema";
import type { MailingListDTO } from "@/src/schemas/mailing-list.schema";

export type RecipientSelection = {
  scope: "all" | "selected";
  personIds: string[];
  mailingListIds: string[];
  extraEmails: string[];
};

type Props = {
  slug: string;
  value: RecipientSelection;
  onChange: (next: RecipientSelection) => void;
};

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RecipientPicker({ slug, value, onChange }: Props) {
  return (
    <Tabs defaultValue="contacts">
      <TabsList variant="line" className="w-full justify-start mb-2">
        <TabsTrigger value="contacts">Contatos</TabsTrigger>
        <TabsTrigger value="lists">Listas</TabsTrigger>
        <TabsTrigger value="extra">Avulsos</TabsTrigger>
      </TabsList>

      <TabsContent value="contacts">
        <ContactsTab slug={slug} value={value} onChange={onChange} />
      </TabsContent>

      <TabsContent value="lists">
        <MailingListsTab slug={slug} value={value} onChange={onChange} />
      </TabsContent>

      <TabsContent value="extra">
        <ExtraEmailsTab value={value} onChange={onChange} />
      </TabsContent>
    </Tabs>
  );
}

function ContactsTab({ slug, value, onChange }: Props) {
  const [people, setPeople] = useState<PersonDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(apiUrl(`/api/workspaces/${slug}/people`));
        const json = await res.json();
        if (!active) return;
        if (res.ok && json.success && Array.isArray(json.data)) {
          setPeople(json.data as PersonDTO[]);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  const peopleWithEmail = useMemo(
    () => people.filter((p) => p.emails.length > 0),
    [people],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return peopleWithEmail;
    return peopleWithEmail.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.emails.some((e) => e.toLowerCase().includes(q)),
    );
  }, [peopleWithEmail, search]);

  const totalWithEmail = peopleWithEmail.length;
  const selectedIds = new Set(value.personIds);
  const isChecked = (id: string) =>
    value.scope === "all" ? true : selectedIds.has(id);
  const selectedCount =
    value.scope === "all" ? totalWithEmail : value.personIds.length;
  const allMarked =
    value.scope === "all" || selectedCount === totalWithEmail;

  const toggle = (id: string) => {
    if (value.scope === "all") {
      const next = peopleWithEmail.map((p) => p.id).filter((x) => x !== id);
      onChange({ ...value, scope: "selected", personIds: next });
      return;
    }
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...value, scope: "selected", personIds: Array.from(next) });
  };

  const toggleAll = () => {
    if (allMarked) {
      onChange({ ...value, scope: "selected", personIds: [] });
    } else {
      onChange({ ...value, scope: "all" });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={2}
            className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-4 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pessoa ou email…"
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleAll}
          disabled={totalWithEmail === 0}
        >
          {allMarked ? "Desmarcar todos" : "Marcar todos"}
        </Button>
      </div>

      <div className="flex items-center justify-between text-muted-foreground text-xs">
        <span>
          {selectedCount} de {totalWithEmail} selecionada(s)
        </span>
        {value.scope === "all" ? (
          <span>Inclui pessoas adicionadas depois</span>
        ) : null}
      </div>

      <div className="max-h-64 overflow-auto rounded-md border border-border">
        {isLoading ? (
          <div className="p-4 text-muted-foreground text-sm">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-muted-foreground text-sm">
            Nenhuma pessoa com email encontrada.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/40">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={isChecked(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-sm">{p.name}</div>
                    <div className="truncate text-muted-foreground text-xs">
                      {p.emails.join(", ")}
                    </div>
                  </div>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MailingListsTab({ slug, value, onChange }: Props) {
  const [lists, setLists] = useState<MailingListDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(
          apiUrl(`/api/workspaces/${slug}/mailing-lists`),
        );
        const json = await res.json();
        if (!active) return;
        if (res.ok && json.success && Array.isArray(json.data)) {
          setLists(json.data as MailingListDTO[]);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  const selectedIds = new Set(value.mailingListIds);

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...value, mailingListIds: Array.from(next) });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-xs">
        Os membros das listas selecionadas serão incluídos como destinatários.
      </p>

      <div className="max-h-64 overflow-auto rounded-md border border-border">
        {isLoading ? (
          <div className="p-4 text-muted-foreground text-sm">Carregando…</div>
        ) : lists.length === 0 ? (
          <div className="p-4 text-muted-foreground text-sm">
            Nenhuma lista criada. Crie listas em Marketing → Listas.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {lists.map((l) => (
              <li key={l.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/40">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={selectedIds.has(l.id)}
                    onChange={() => toggle(l.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-sm">{l.name}</div>
                    <div className="truncate text-muted-foreground text-xs">
                      {l.memberCount} membro(s)
                      {l.description ? ` · ${l.description}` : ""}
                    </div>
                  </div>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedIds.size > 0 ? (
        <p className="text-muted-foreground text-xs">
          {selectedIds.size} lista(s) selecionada(s)
        </p>
      ) : null}
    </div>
  );
}

function ExtraEmailsTab({
  value,
  onChange,
}: {
  value: RecipientSelection;
  onChange: (next: RecipientSelection) => void;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const addEmail = () => {
    const email = input.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_RX.test(email)) {
      setError("Email inválido");
      return;
    }
    if (value.extraEmails.includes(email)) {
      setError("Email já adicionado");
      return;
    }
    onChange({ ...value, extraEmails: [...value.extraEmails, email] });
    setInput("");
    setError("");
  };

  const removeEmail = (email: string) => {
    onChange({
      ...value,
      extraEmails: value.extraEmails.filter((e) => e !== email),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEmail();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-xs">
        Adicione emails que não estão cadastrados no CRM.
      </p>

      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError("");
            }}
            onKeyDown={handleKeyDown}
            placeholder="nome@empresa.com"
            type="email"
          />
          {error ? (
            <p className="mt-1 text-destructive text-xs">{error}</p>
          ) : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addEmail}>
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
          Adicionar
        </Button>
      </div>

      {value.extraEmails.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.extraEmails.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs"
            >
              {email}
              <button
                type="button"
                onClick={() => removeEmail(email)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remover ${email}`}
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">Nenhum email avulso adicionado.</p>
      )}
    </div>
  );
}
