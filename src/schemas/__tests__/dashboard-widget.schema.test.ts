import { describe, expect, it } from "vitest";
import {
  CreateWidgetSchema,
  UpdateWidgetSchema,
  widgetConfigSchema,
} from "@/src/schemas/dashboard-widget.schema";

describe("CreateWidgetSchema", () => {
  it("aceita um chart com defaults de layout e de config", () => {
    const parsed = CreateWidgetSchema.safeParse({
      type: "CHART",
      config: { chartType: "pie" },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.type === "CHART") {
      expect(parsed.data.w).toBe(4);
      expect(parsed.data.h).toBe(6);
      // Defaults da customização do chart (custom-charts.md).
      expect(parsed.data.config.source).toBe("companies");
      expect(parsed.data.config.legend).toBe(true);
      expect(parsed.data.config.filters).toEqual([]);
      expect(parsed.data.config.xSort).toBe("none");
    }
  });

  it("rejeita chartType inválido", () => {
    const parsed = CreateWidgetSchema.safeParse({
      type: "CHART",
      config: { chartType: "donut" },
    });
    expect(parsed.success).toBe(false);
  });

  it("normaliza a URL do iframe", () => {
    const parsed = CreateWidgetSchema.safeParse({
      type: "IFRAME",
      config: { url: "example.com/embed" },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.type === "IFRAME") {
      expect(parsed.data.config.url).toBe("https://example.com/embed");
    }
  });

  it("aplica defaults de view (fields/filters/sort vazios)", () => {
    const parsed = CreateWidgetSchema.safeParse({
      type: "VIEW",
      config: { source: "companies" },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.type === "VIEW") {
      expect(parsed.data.config.fields).toEqual([]);
      expect(parsed.data.config.sort).toEqual([]);
    }
  });
});

describe("UpdateWidgetSchema", () => {
  it("rejeita objeto vazio", () => {
    expect(UpdateWidgetSchema.safeParse({}).success).toBe(false);
  });

  it("aceita só layout parcial", () => {
    expect(UpdateWidgetSchema.safeParse({ w: 6 }).success).toBe(true);
  });
});

describe("widgetConfigSchema", () => {
  it("valida config de view conforme o tipo", () => {
    const schema = widgetConfigSchema("VIEW");
    expect(schema.safeParse({ source: "people" }).success).toBe(true);
    expect(schema.safeParse({ source: "nope" }).success).toBe(false);
  });
});
