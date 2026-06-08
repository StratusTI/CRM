import type { NextRequest } from "next/server";
import { getAuthSession } from "@/src/lib/auth-session";
import { toCsv, toSpreadsheetML } from "@/src/lib/export";
import { ReportService } from "@/src/services/report.service";
import { handleError } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; id: string }>;
};

/** Exporta o relatório processado em CSV (default) ou Excel (?format=xlsx). */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, id } = await params;
  const result = await ReportService.getData(session.value.user.id, slug, id);
  if (!result.ok) return handleError(result.error);

  // `toCsv`/`toSpreadsheetML` usam a coluna como cabeçalho e como chave da linha,
  // então remapeamos as linhas para serem indexadas pelo rótulo amigável.
  const headers = result.value.columns.map((c) => c.label);
  const rows = result.value.rows.map((row) =>
    Object.fromEntries(result.value.columns.map((c) => [c.label, row[c.key]])),
  );
  const format = request.nextUrl.searchParams.get("format");

  if (format === "xlsx" || format === "excel") {
    const body = toSpreadsheetML(headers, rows);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": 'attachment; filename="relatorio.xls"',
      },
    });
  }

  const body = toCsv(headers, rows);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="relatorio.csv"',
    },
  });
}
