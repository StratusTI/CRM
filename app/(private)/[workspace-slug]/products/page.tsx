import { ProductsTable } from "@/components/tables/products-table";

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <ProductsTable slug={slug} />;
}
