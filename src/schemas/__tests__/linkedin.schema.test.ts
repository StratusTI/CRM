import { describe, expect, it } from "vitest";
import {
  LinkedInOverviewSchema,
  LinkedInPublishInputSchema,
  LinkedInPublishOutputSchema,
} from "@/src/schemas/linkedin.schema";

describe("LinkedInOverviewSchema", () => {
  it("aceita campos nuláveis", () => {
    expect(
      LinkedInOverviewSchema.safeParse({
        personId: "p",
        name: null,
        headline: null,
        email: null,
        picture: null,
      }).success,
    ).toBe(true);
  });

  it("rejeita sem personId", () => {
    expect(
      LinkedInOverviewSchema.safeParse({
        name: null,
        headline: null,
        email: null,
        picture: null,
      }).success,
    ).toBe(false);
  });
});

describe("LinkedInPublishInputSchema", () => {
  it("aceita texto dentro do limite", () => {
    expect(LinkedInPublishInputSchema.safeParse({ text: "oi" }).success).toBe(
      true,
    );
  });

  it("rejeita vazio e acima de 3000", () => {
    expect(LinkedInPublishInputSchema.safeParse({ text: "" }).success).toBe(
      false,
    );
    expect(
      LinkedInPublishInputSchema.safeParse({ text: "a".repeat(3001) }).success,
    ).toBe(false);
  });
});

describe("LinkedInPublishOutputSchema", () => {
  it("valida URN", () => {
    expect(
      LinkedInPublishOutputSchema.safeParse({ postUrn: "urn:li:share:1" })
        .success,
    ).toBe(true);
  });
});
