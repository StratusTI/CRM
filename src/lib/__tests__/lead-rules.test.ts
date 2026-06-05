import { describe, expect, it } from "vitest";
import { matchesCondition } from "@/src/lib/lead-rules";

const lead = {
  name: "Maria",
  emails: ["maria@acme.com"],
  phones: [],
  company: "Acme",
  jobTitle: "CEO",
  source: "WhatsApp",
  city: null,
};

describe("matchesCondition", () => {
  it("equals casa por valor exato (case-insensitive)", () => {
    expect(matchesCondition(lead, "source", "equals", "whatsapp")).toBe(true);
    expect(matchesCondition(lead, "source", "equals", "site")).toBe(false);
  });

  it("contains casa por substring", () => {
    expect(matchesCondition(lead, "email", "contains", "acme.com")).toBe(true);
    expect(matchesCondition(lead, "email", "contains", "gmail")).toBe(false);
  });

  it("is_empty / is_not_empty avaliam presença", () => {
    expect(matchesCondition(lead, "city", "is_empty", null)).toBe(true);
    expect(matchesCondition(lead, "company", "is_not_empty", null)).toBe(true);
    expect(matchesCondition(lead, "company", "is_empty", null)).toBe(false);
  });

  it("not_equals nega o valor", () => {
    expect(matchesCondition(lead, "jobTitle", "not_equals", "CTO")).toBe(true);
    expect(matchesCondition(lead, "jobTitle", "not_equals", "CEO")).toBe(false);
  });
});
