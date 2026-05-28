import { describe, expect, it } from "vitest";
import {
  PublishTweetSchema,
  TwitterProfileOverviewSchema,
} from "@/src/schemas/twitter.schema";

describe("TwitterProfileOverviewSchema", () => {
  const base = {
    id: "123",
    username: "acme",
    name: "Acme",
    profileImageUrl: null,
  };

  it("valida um overview completo", () => {
    expect(TwitterProfileOverviewSchema.safeParse(base).success).toBe(true);
  });

  it("aceita name nulo", () => {
    expect(
      TwitterProfileOverviewSchema.safeParse({ ...base, name: null }).success,
    ).toBe(true);
  });

  it("rejeita id ausente", () => {
    const { id: _id, ...withoutId } = base;
    expect(TwitterProfileOverviewSchema.safeParse(withoutId).success).toBe(
      false,
    );
  });
});

describe("PublishTweetSchema", () => {
  it("aceita texto dentro do limite", () => {
    expect(PublishTweetSchema.safeParse({ text: "Olá mundo" }).success).toBe(
      true,
    );
  });

  it("rejeita texto vazio", () => {
    expect(PublishTweetSchema.safeParse({ text: "   " }).success).toBe(false);
  });

  it("rejeita acima de 280 caracteres", () => {
    expect(
      PublishTweetSchema.safeParse({ text: "a".repeat(281) }).success,
    ).toBe(false);
  });
});
