"use client";

import {
  Loading02Icon,
  Location01Icon,
  MapsLocation01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  CepNotFoundError,
  formatCep,
  isCompleteCep,
  lookupCep,
  normalizeCep,
} from "@/lib/cep";
import type { CompanyAddress } from "@/src/schemas/company.schema";

type Draft = {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
};

const EMPTY_DRAFT: Draft = {
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  latitude: "",
  longitude: "",
};

function toDraft(value: CompanyAddress | null | undefined): Draft {
  if (!value) return { ...EMPTY_DRAFT };
  return {
    cep: value.cep ? formatCep(value.cep) : "",
    street: value.street ?? "",
    number: value.number ?? "",
    complement: value.complement ?? "",
    neighborhood: value.neighborhood ?? "",
    city: value.city ?? "",
    state: value.state ?? "",
    latitude: value.latitude != null ? String(value.latitude) : "",
    longitude: value.longitude != null ? String(value.longitude) : "",
  };
}

/** Converte o rascunho em `CompanyAddress`, removendo campos vazios. */
function toAddress(draft: Draft): CompanyAddress | null {
  const text = (v: string) => {
    const t = v.trim();
    return t === "" ? undefined : t;
  };
  const coord = (v: string) => {
    const n = Number(v);
    return v.trim() !== "" && Number.isFinite(n) ? n : undefined;
  };

  const address: CompanyAddress = {
    cep: text(draft.cep),
    street: text(draft.street),
    number: text(draft.number),
    complement: text(draft.complement),
    neighborhood: text(draft.neighborhood),
    city: text(draft.city),
    state: text(draft.state.toUpperCase()),
    latitude: coord(draft.latitude),
    longitude: coord(draft.longitude),
  };

  const hasValue = Object.values(address).some((v) => v !== undefined);
  return hasValue ? address : null;
}

export function AddressPanel({
  open,
  onOpenChange,
  value,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: CompanyAddress | null | undefined;
  onSave: (next: CompanyAddress | null) => void;
}) {
  const [draft, setDraft] = React.useState<Draft>(() => toDraft(value));
  const [loading, setLoading] = React.useState(false);
  const lastLookup = React.useRef<string>("");

  // Reinicia o rascunho sempre que o painel abre.
  React.useEffect(() => {
    if (open) {
      setDraft(toDraft(value));
      lastLookup.current = value?.cep ? normalizeCep(value.cep) : "";
    }
  }, [open, value]);

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  const runLookup = React.useCallback(async (rawCep: string) => {
    const cep = normalizeCep(rawCep);
    if (!isCompleteCep(cep) || cep === lastLookup.current) return;
    lastLookup.current = cep;
    setLoading(true);
    try {
      const result = await lookupCep(cep);
      setDraft((d) => ({
        ...d,
        cep: result.cep,
        street: result.street ?? d.street,
        neighborhood: result.neighborhood ?? d.neighborhood,
        city: result.city ?? d.city,
        state: result.state ?? d.state,
        latitude:
          result.latitude != null ? String(result.latitude) : d.latitude,
        longitude:
          result.longitude != null ? String(result.longitude) : d.longitude,
      }));
      if (result.latitude == null) {
        toast.success("Endereço preenchido", {
          description: "Coordenadas indisponíveis para este CEP.",
        });
      } else {
        toast.success("Endereço preenchido pelo CEP");
      }
    } catch (error) {
      lastLookup.current = "";
      toast.error(
        error instanceof CepNotFoundError
          ? "CEP não encontrado"
          : "Não foi possível consultar o CEP",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  function handleCepChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatCep(e.target.value);
    setDraft((d) => ({ ...d, cep: formatted }));
    if (isCompleteCep(formatted)) void runLookup(formatted);
  }

  function handleSave() {
    onSave(toAddress(draft));
    onOpenChange(false);
  }

  const hasCoords = draft.latitude !== "" && draft.longitude !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Endereço da empresa</DialogTitle>
          <DialogDescription>
            Informe o CEP para preencher o endereço automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <Field className="sm:col-span-3">
            <FieldLabel htmlFor="address-cep">CEP</FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                id="address-cep"
                value={draft.cep}
                onChange={handleCepChange}
                placeholder="00000-000"
                inputMode="numeric"
                autoComplete="off"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Buscar CEP"
                disabled={loading || !isCompleteCep(draft.cep)}
                onClick={() => {
                  lastLookup.current = "";
                  void runLookup(draft.cep);
                }}
              >
                {loading ? (
                  <HugeiconsIcon
                    icon={Loading02Icon}
                    strokeWidth={2}
                    className="animate-spin"
                  />
                ) : (
                  <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
                )}
              </Button>
            </div>
          </Field>

          <Field className="sm:col-span-3">
            <FieldLabel htmlFor="address-state">UF</FieldLabel>
            <Input
              id="address-state"
              value={draft.state}
              onChange={set("state")}
              placeholder="SP"
              maxLength={2}
              className="uppercase"
            />
          </Field>

          <Field className="sm:col-span-4">
            <FieldLabel htmlFor="address-street">Logradouro</FieldLabel>
            <Input
              id="address-street"
              value={draft.street}
              onChange={set("street")}
              placeholder="Av. Paulista"
            />
          </Field>

          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="address-number">Número</FieldLabel>
            <Input
              id="address-number"
              value={draft.number}
              onChange={set("number")}
              placeholder="1000"
            />
          </Field>

          <Field className="sm:col-span-3">
            <FieldLabel htmlFor="address-neighborhood">Bairro</FieldLabel>
            <Input
              id="address-neighborhood"
              value={draft.neighborhood}
              onChange={set("neighborhood")}
              placeholder="Bela Vista"
            />
          </Field>

          <Field className="sm:col-span-3">
            <FieldLabel htmlFor="address-complement">Complemento</FieldLabel>
            <Input
              id="address-complement"
              value={draft.complement}
              onChange={set("complement")}
              placeholder="Sala 42"
            />
          </Field>

          <Field className="sm:col-span-6">
            <FieldLabel htmlFor="address-city">Cidade</FieldLabel>
            <Input
              id="address-city"
              value={draft.city}
              onChange={set("city")}
              placeholder="São Paulo"
            />
          </Field>

          <Field className="sm:col-span-3">
            <FieldLabel htmlFor="address-latitude">
              <HugeiconsIcon
                icon={Location01Icon}
                strokeWidth={2}
                className="size-3.5 text-muted-foreground"
              />
              Latitude
            </FieldLabel>
            <Input
              id="address-latitude"
              value={draft.latitude}
              onChange={set("latitude")}
              placeholder="—"
              inputMode="decimal"
            />
          </Field>

          <Field className="sm:col-span-3">
            <FieldLabel htmlFor="address-longitude">
              <HugeiconsIcon
                icon={Location01Icon}
                strokeWidth={2}
                className="size-3.5 text-muted-foreground"
              />
              Longitude
            </FieldLabel>
            <Input
              id="address-longitude"
              value={draft.longitude}
              onChange={set("longitude")}
              placeholder="—"
              inputMode="decimal"
            />
          </Field>
        </div>

        {hasCoords ? (
          <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <HugeiconsIcon
              icon={MapsLocation01Icon}
              strokeWidth={2}
              className="size-3.5"
            />
            Coordenadas: {draft.latitude}, {draft.longitude}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar endereço</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
