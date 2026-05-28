"use client";

import {
  Add01Icon,
  BulbIcon,
  Calendar03Icon,
  CallReceivedIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  ClipboardIcon,
  Database01Icon,
  DatabaseSync01Icon,
  Delete01Icon,
  Edit02Icon,
  FilterIcon,
  GitBranchIcon,
  Mail01Icon,
  PlayIcon,
  PlusSignIcon,
  Search01Icon,
  Time04Icon,
  WaterPumpIcon,
  WebhookIcon,
  WorkflowCircle01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  addEdge,
  Background,
  type Connection,
  Controls,
  type Edge,
  Handle,
  MiniMap,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  activateWorkflow,
  discardDraft,
  saveDraft,
  triggerWorkflow,
  useWorkflow,
} from "@/src/hooks/use-workflow";
import {
  type WorkflowDefinition,
  type WorkflowEdge as WfEdge,
  type WorkflowNode as WfNode,
  type WorkflowNodeData,
  type WorkflowNodeType,
  type WorkflowTriggerData,
  type WorkflowTriggerType,
} from "@/src/schemas/workflow.schema";
import { WorkflowConfigPanel } from "@/components/workflows/workflow-config-panel";
import { WorkflowRunsDrawer } from "@/components/workflows/workflow-runs-drawer";

/* ============================ palette icons ============================== */

const TRIGGER_META: Record<
  WorkflowTriggerType,
  { label: string; description: string; icon: typeof PlayIcon }
> = {
  "record-is-created": {
    label: "Registro criado",
    description: "Dispara quando um registro é criado",
    icon: PlusSignIcon,
  },
  "record-is-updated": {
    label: "Registro atualizado",
    description: "Dispara quando um registro é atualizado",
    icon: Edit02Icon,
  },
  "record-is-deleted": {
    label: "Registro excluído",
    description: "Dispara quando um registro é excluído",
    icon: Delete01Icon,
  },
  "record-is-created-or-updated": {
    label: "Registro criado/atualizado",
    description: "Dispara em criação ou atualização",
    icon: DatabaseSync01Icon,
  },
  "launch-manually": {
    label: "Disparo manual",
    description: "Disparado por um botão",
    icon: PlayIcon,
  },
  "on-a-schedule": {
    label: "Agendado",
    description: "Em horários (cron)",
    icon: Calendar03Icon,
  },
  webhook: {
    label: "Webhook",
    description: "POST em URL pública",
    icon: WebhookIcon,
  },
};

const NODE_META: Record<
  WorkflowNodeType,
  { label: string; description: string; icon: typeof Database01Icon; group: string }
> = {
  "create-record": {
    label: "Criar registro",
    description: "Cria um registro do CRM",
    icon: Database01Icon,
    group: "Registros",
  },
  "update-record": {
    label: "Atualizar registro",
    description: "Atualiza um registro existente",
    icon: Edit02Icon,
    group: "Registros",
  },
  "delete-record": {
    label: "Excluir registro",
    description: "Marca como excluído",
    icon: Delete01Icon,
    group: "Registros",
  },
  "search-records": {
    label: "Buscar registros",
    description: "Lista registros que batem com filtros",
    icon: Search01Icon,
    group: "Registros",
  },
  "create-or-update-record": {
    label: "Upsert de registro",
    description: "Cria ou atualiza pelo campo de lookup",
    icon: DatabaseSync01Icon,
    group: "Registros",
  },
  iterator: {
    label: "Iterar",
    description: "Executa o branch pra cada item",
    icon: WaterPumpIcon,
    group: "Controle",
  },
  filter: {
    label: "Filtro",
    description: "Para o branch se a condição falha",
    icon: FilterIcon,
    group: "Controle",
  },
  "if-else": {
    label: "If / Else",
    description: "Bifurca em true/false",
    icon: GitBranchIcon,
    group: "Controle",
  },
  delay: {
    label: "Atraso",
    description: "Pausa por uma duração",
    icon: Time04Icon,
    group: "Controle",
  },
  "send-email": {
    label: "Enviar email",
    description: "Dispara via Resend",
    icon: Mail01Icon,
    group: "Comunicação",
  },
  "draft-email": {
    label: "Rascunho de email",
    description: "Salva como rascunho",
    icon: ClipboardIcon,
    group: "Comunicação",
  },
  form: {
    label: "Formulário",
    description: "Pausa pedindo input humano",
    icon: BulbIcon,
    group: "Humano",
  },
};

/* ============================== custom nodes ============================= */

type TriggerXyNode = Node<{
  trigger: WorkflowTriggerData | null;
  onClick: () => void;
}>;

type ActionXyNode = Node<{ node: WfNode; onClick: () => void }>;

function TriggerNodeView({ data, selected }: NodeProps<TriggerXyNode>) {
  const trigger = data.trigger;
  const meta = trigger ? TRIGGER_META[trigger.type] : null;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={data.onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") data.onClick();
      }}
      className={cn(
        "group relative w-[260px] rounded-xl border bg-card p-3 text-card-foreground shadow-sm transition-all hover:border-primary/40 hover:shadow-md",
        selected && "border-primary ring-2 ring-primary/30",
      )}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
        <HugeiconsIcon icon={PlayIcon} strokeWidth={2} size={14} />
        <span>Gatilho</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon
            icon={meta?.icon ?? PlayIcon}
            strokeWidth={2}
            size={18}
          />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {meta?.label ?? "Selecione um gatilho"}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {meta?.description ?? "Clique para configurar"}
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-2 !border-2 !border-background !bg-primary"
      />
    </div>
  );
}

function ActionNodeView({ data, selected }: NodeProps<ActionXyNode>) {
  const meta = NODE_META[data.node.data.type];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={data.onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") data.onClick();
      }}
      className={cn(
        "group relative w-[240px] rounded-xl border bg-card p-3 text-card-foreground shadow-sm transition-all hover:border-primary/40 hover:shadow-md",
        selected && "border-primary ring-2 ring-primary/30",
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!size-2 !border-2 !border-background !bg-muted-foreground"
      />
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
        <span>{meta.group}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="grid size-9 place-items-center rounded-lg bg-secondary text-secondary-foreground">
          <HugeiconsIcon icon={meta.icon} strokeWidth={2} size={18} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {data.node.data.label || meta.label}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {meta.description}
          </div>
        </div>
      </div>
      {data.node.data.type === "if-else" ? (
        <>
          <Handle
            type="source"
            id="true"
            position={Position.Bottom}
            style={{ left: "30%" }}
            className="!size-2 !border-2 !border-background !bg-emerald-500"
          />
          <Handle
            type="source"
            id="false"
            position={Position.Bottom}
            style={{ left: "70%" }}
            className="!size-2 !border-2 !border-background !bg-rose-500"
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!size-2 !border-2 !border-background !bg-muted-foreground"
        />
      )}
    </div>
  );
}

const NODE_TYPES = {
  trigger: TriggerNodeView,
  action: ActionNodeView,
};

/* ========================== editor entry ================================ */

export function WorkflowEditor({
  slug,
  workflowId,
}: {
  slug: string;
  workflowId: string;
}) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner slug={slug} workflowId={workflowId} />
    </ReactFlowProvider>
  );
}

function WorkflowEditorInner({
  slug,
  workflowId,
}: {
  slug: string;
  workflowId: string;
}) {
  const router = useRouter();
  const { workflow, draft, setDraft, isLoading, error, refetch } = useWorkflow(
    slug,
    workflowId,
  );

  const [selected, setSelected] = useState<string | null>(null);
  const [runsOpen, setRunsOpen] = useState(false);

  const definition = draft?.definition;

  const initialNodes = useMemo<Node[]>(() => {
    if (!definition) return [];
    return buildNodes(definition, (id) => setSelected(id));
  }, [definition]);

  const initialEdges = useMemo<Edge[]>(() => {
    if (!definition) return [];
    return buildEdges(definition);
  }, [definition]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sincroniza quando carrega/refresca.
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  /* ---------- autosave debounced ---------- */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = useCallback(
    (next: WorkflowDefinition) => {
      setDraft((current) =>
        current ? { ...current, definition: next } : current,
      );
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const saved = await saveDraft(slug, workflowId, { definition: next });
        if (!saved) toast.error("Não foi possível salvar o workflow.");
      }, 600);
    },
    [setDraft, slug, workflowId],
  );

  /* ---------- node/edge change handlers ---------- */
  const updateDefinitionFromCanvas = useCallback(
    (
      nextNodes: Node[] = nodes,
      nextEdges: Edge[] = edges,
      overrides: Partial<WorkflowDefinition> = {},
    ) => {
      if (!definition) return;
      const triggerNode = nextNodes.find((n) => n.id === "trigger");
      const action = nextNodes.filter((n) => n.id !== "trigger");
      const next: WorkflowDefinition = {
        trigger: {
          id: "trigger",
          position: triggerNode?.position ?? definition.trigger.position,
          data: definition.trigger.data,
        },
        nodes: action.map((n) => {
          const original = definition.nodes.find((o) => o.id === n.id);
          if (!original) {
            return {
              id: n.id,
              position: n.position,
              data: (n.data as { node: WfNode }).node.data,
            };
          }
          return { ...original, position: n.position };
        }),
        edges: nextEdges.map<WfEdge>((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? undefined,
        })),
        ...overrides,
      };
      persist(next);
    },
    [definition, edges, nodes, persist],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((es) => {
        const next = addEdge(connection, es);
        updateDefinitionFromCanvas(nodes, next);
        return next;
      });
    },
    [nodes, setEdges, updateDefinitionFromCanvas],
  );

  const onNodeDragStop = useCallback(() => {
    updateDefinitionFromCanvas();
  }, [updateDefinitionFromCanvas]);

  /* ---------- actions ---------- */

  const onPickTrigger = (type: WorkflowTriggerType) => {
    if (!definition) return;
    const data = defaultTriggerData(type);
    persist({ ...definition, trigger: { ...definition.trigger, data } });
    setSelected("trigger");
  };

  const onAddNode = (type: WorkflowNodeType) => {
    if (!definition) return;
    const id = `n_${Math.random().toString(36).slice(2, 8)}`;
    const newNode: WfNode = {
      id,
      position: {
        x: 60 + Math.random() * 200,
        y: 200 + definition.nodes.length * 100,
      },
      data: defaultNodeData(type),
    };
    persist({
      ...definition,
      nodes: [...definition.nodes, newNode],
    });
    setSelected(id);
  };

  const onUpdateTrigger = (data: WorkflowTriggerData | null) => {
    if (!definition) return;
    persist({ ...definition, trigger: { ...definition.trigger, data } });
  };

  const onUpdateNode = (id: string, data: WorkflowNodeData) => {
    if (!definition) return;
    persist({
      ...definition,
      nodes: definition.nodes.map((n) => (n.id === id ? { ...n, data } : n)),
    });
  };

  const onDeleteNode = (id: string) => {
    if (!definition) return;
    persist({
      ...definition,
      nodes: definition.nodes.filter((n) => n.id !== id),
      edges: definition.edges.filter(
        (e) => e.source !== id && e.target !== id,
      ),
    });
    setSelected(null);
  };

  const onActivate = async () => {
    const res = await activateWorkflow(slug, workflowId);
    if (res) {
      toast.success("Workflow ativado");
      refetch();
    } else toast.error("Não foi possível ativar — verifique o gatilho.");
  };

  const onDiscard = async () => {
    if (
      !window.confirm("Descartar todas as alterações desde a última versão ativa?")
    )
      return;
    const res = await discardDraft(slug, workflowId);
    if (res) {
      toast.success("Alterações descartadas");
      refetch();
    } else toast.error("Não foi possível descartar as alterações.");
  };

  const onTest = async () => {
    const res = await triggerWorkflow(slug, workflowId, {}, true);
    if (res) {
      toast.success(`Run de teste iniciada (${res.status.toLowerCase()})`);
      setRunsOpen(true);
    } else toast.error("Falha ao iniciar a run de teste.");
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Skeleton className="h-6 w-40" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }
  if (error || !workflow || !definition) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {error ?? "Workflow não encontrado."}
      </div>
    );
  }

  const selectedNode = selected
    ? definition.nodes.find((n) => n.id === selected) ?? null
    : null;

  return (
    <div className="flex h-full flex-col">
      <TopBar
        name={workflow.name}
        status={workflow.status}
        onBack={() => router.push(`/${slug}/workflows`)}
        onActivate={onActivate}
        onDiscard={onDiscard}
        onTest={onTest}
        onShowRuns={() => setRunsOpen(true)}
        onPickTrigger={onPickTrigger}
        onAddNode={onAddNode}
        triggerConfigured={Boolean(definition.trigger.data)}
      />
      <div className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          nodeTypes={NODE_TYPES}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable className="!bg-muted/40" />
        </ReactFlow>
      </div>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent
          className="!w-[420px] !max-w-[420px] overflow-auto p-0"
          side="right"
        >
          <WorkflowConfigPanel
            selectedId={selected}
            trigger={definition.trigger}
            node={selectedNode}
            onUpdateTrigger={onUpdateTrigger}
            onUpdateNode={onUpdateNode}
            onDeleteNode={onDeleteNode}
            onClose={() => setSelected(null)}
          />
        </SheetContent>
      </Sheet>

      <WorkflowRunsDrawer
        slug={slug}
        workflowId={workflowId}
        open={runsOpen}
        onOpenChange={setRunsOpen}
      />
    </div>
  );
}

/* =============================== top bar ================================ */

function TopBar({
  name,
  status,
  onBack,
  onActivate,
  onDiscard,
  onTest,
  onShowRuns,
  onPickTrigger,
  onAddNode,
  triggerConfigured,
}: {
  name: string;
  status: string;
  onBack: () => void;
  onActivate: () => void;
  onDiscard: () => void;
  onTest: () => void;
  onShowRuns: () => void;
  onPickTrigger: (type: WorkflowTriggerType) => void;
  onAddNode: (type: WorkflowNodeType) => void;
  triggerConfigured: boolean;
}) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur">
      <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Voltar">
        <HugeiconsIcon icon={WorkflowCircle01Icon} strokeWidth={2} size={18} />
      </Button>
      <div className="min-w-0 truncate text-sm font-semibold">{name}</div>
      <span
        className={cn(
          "ml-2 rounded-full border px-2 py-0.5 text-xs",
          status === "ACTIVE"
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
            : "border-amber-500/40 bg-amber-500/10 text-amber-600",
        )}
      >
        {status === "ACTIVE" ? "Ativo" : "Rascunho"}
      </span>
      <div className="ml-auto flex items-center gap-1.5">
        <Button size="sm" variant="ghost" onClick={onShowRuns}>
          <HugeiconsIcon icon={CallReceivedIcon} strokeWidth={2} />
          Ver runs
        </Button>
        <Button size="sm" variant="ghost" onClick={onTest}>
          <HugeiconsIcon icon={PlayIcon} strokeWidth={2} />
          Test
        </Button>
        <Button size="sm" variant="ghost" onClick={onDiscard}>
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
          Discard
        </Button>
        <Button size="sm" onClick={onActivate}>
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
          Active
        </Button>
        <AddMenu
          onPickTrigger={onPickTrigger}
          onAddNode={onAddNode}
          triggerConfigured={triggerConfigured}
        />
      </div>
    </div>
  );
}

function AddMenu({
  onPickTrigger,
  onAddNode,
  triggerConfigured,
}: {
  onPickTrigger: (type: WorkflowTriggerType) => void;
  onAddNode: (type: WorkflowNodeType) => void;
  triggerConfigured: boolean;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, WorkflowNodeType[]>();
    for (const [t, meta] of Object.entries(NODE_META) as [
      WorkflowNodeType,
      (typeof NODE_META)[WorkflowNodeType],
    ][]) {
      const arr = map.get(meta.group) ?? [];
      arr.push(t);
      map.set(meta.group, arr);
    }
    return map;
  }, []);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="sm" variant="outline">
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
            Add a node
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-[280px]">
        {!triggerConfigured && (
          <>
            <DropdownMenuLabel>Gatilhos</DropdownMenuLabel>
            {(Object.keys(TRIGGER_META) as WorkflowTriggerType[]).map(
              (type) => {
                const meta = TRIGGER_META[type];
                return (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => onPickTrigger(type)}
                  >
                    <HugeiconsIcon icon={meta.icon} strokeWidth={2} />
                    <span className="flex-1">{meta.label}</span>
                  </DropdownMenuItem>
                );
              },
            )}
            <DropdownMenuSeparator />
          </>
        )}
        {[...grouped.entries()].map(([group, types]) => (
          <SectionGroup key={group} title={group}>
            {types.map((type) => {
              const meta = NODE_META[type];
              return (
                <DropdownMenuItem key={type} onClick={() => onAddNode(type)}>
                  <HugeiconsIcon icon={meta.icon} strokeWidth={2} />
                  <span className="flex-1">{meta.label}</span>
                </DropdownMenuItem>
              );
            })}
          </SectionGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SectionGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <DropdownMenuLabel className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
        {title}
      </DropdownMenuLabel>
      {children}
      <DropdownMenuSeparator />
    </>
  );
}

/* ======================== node ↔ xyflow mapping ========================= */

function buildNodes(
  def: WorkflowDefinition,
  onSelect: (id: string) => void,
): Node[] {
  const trigger: Node = {
    id: "trigger",
    type: "trigger",
    position: def.trigger.position,
    data: { trigger: def.trigger.data, onClick: () => onSelect("trigger") },
  };
  const actions: Node[] = def.nodes.map((n) => ({
    id: n.id,
    type: "action",
    position: n.position,
    data: { node: n, onClick: () => onSelect(n.id) },
  }));
  return [trigger, ...actions];
}

function buildEdges(def: WorkflowDefinition): Edge[] {
  return def.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    animated: true,
    style: { strokeWidth: 1.5 },
  }));
}

/* ============================ defaults ================================= */

function defaultTriggerData(type: WorkflowTriggerType): WorkflowTriggerData {
  switch (type) {
    case "record-is-created":
    case "record-is-deleted":
      return { type, entity: "person" };
    case "record-is-updated":
    case "record-is-created-or-updated":
      return { type, entity: "person", fields: [] };
    case "launch-manually":
      return { type, inputs: [] };
    case "on-a-schedule":
      return { type, cron: "0 9 * * *", timezone: "UTC" };
    case "webhook":
      return { type, token: makeWebhookToken() };
  }
}

function defaultNodeData(type: WorkflowNodeType): WorkflowNodeData {
  switch (type) {
    case "create-record":
      return { type, entity: "task", fields: {} };
    case "update-record":
      return { type, entity: "task", recordId: "", fields: {} };
    case "delete-record":
      return { type, entity: "task", recordId: "" };
    case "search-records":
      return { type, entity: "task", conditions: [], limit: 50 };
    case "create-or-update-record":
      return {
        type,
        entity: "person",
        lookupField: "emails",
        lookupValue: "",
        fields: {},
      };
    case "iterator":
      return { type, source: "", itemAlias: "item" };
    case "filter":
      return { type, conditions: [] };
    case "if-else":
      return { type, conditions: [] };
    case "delay":
      return { type, amount: 5, unit: "minutes" };
    case "send-email":
      return { type, to: "", subject: "", body: "" };
    case "draft-email":
      return { type, to: "", subject: "", body: "" };
    case "form":
      return {
        type,
        title: "Preencha o formulário",
        fields: [{ name: "field_1", type: "text", required: false }],
      };
  }
}

function makeWebhookToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
