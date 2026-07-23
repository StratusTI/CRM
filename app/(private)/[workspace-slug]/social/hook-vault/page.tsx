import { HookVaultTable } from "@/components/tables/hook-vault-table";

export default async function HookVaultPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <HookVaultTable slug={slug} />;
}
