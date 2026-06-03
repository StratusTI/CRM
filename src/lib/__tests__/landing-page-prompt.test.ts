import { describe, expect, it } from "vitest";
import {
  extractHtml,
  parseRenderArgs,
  RENDER_LANDING_PAGE_TOOL,
} from "@/src/lib/ai/landing-page-prompt";

const DOC = "<!DOCTYPE html><html><body>oi</body></html>";

describe("parseRenderArgs", () => {
  it("extrai html e summary dos argumentos da tool", () => {
    const args = JSON.stringify({ summary: "Feito.", html: DOC });
    expect(parseRenderArgs(args)).toEqual({ html: DOC, summary: "Feito." });
  });

  it("limpa cercas de código residuais do html", () => {
    const args = JSON.stringify({
      summary: "x",
      html: `\`\`\`html\n${DOC}\n\`\`\``,
    });
    expect(parseRenderArgs(args).html).toBe(DOC);
  });

  it("apara o summary", () => {
    const args = JSON.stringify({ summary: "  oi  ", html: DOC });
    expect(parseRenderArgs(args).summary).toBe("oi");
  });

  it("devolve campos vazios em JSON inválido (args truncados)", () => {
    expect(parseRenderArgs('{"html": "<!DOCTYPE')).toEqual({
      html: "",
      summary: "",
    });
  });

  it("ignora campos de tipo errado", () => {
    const args = JSON.stringify({ summary: 42, html: null });
    expect(parseRenderArgs(args)).toEqual({ html: "", summary: "" });
  });
});

describe("extractHtml", () => {
  it("recorta texto antes do doctype", () => {
    expect(extractHtml(`Claro! Aqui está:\n${DOC}`)).toBe(DOC);
  });

  it("remove cercas de código", () => {
    expect(extractHtml(`\`\`\`html\n${DOC}\n\`\`\``)).toBe(DOC);
  });
});

describe("RENDER_LANDING_PAGE_TOOL", () => {
  it("expõe a função com html e summary obrigatórios", () => {
    expect(RENDER_LANDING_PAGE_TOOL.function.name).toBe("render_landing_page");
    const params = RENDER_LANDING_PAGE_TOOL.function.parameters as {
      required: string[];
      properties: Record<string, unknown>;
    };
    expect(params.required).toEqual(["summary", "html"]);
    expect(Object.keys(params.properties).sort()).toEqual(["html", "summary"]);
  });
});
