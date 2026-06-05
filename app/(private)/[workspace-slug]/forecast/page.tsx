import { ForecastBoard } from "@/components/forecast/forecast-board";

export default async function ForecastPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <ForecastBoard slug={slug} />;
}
