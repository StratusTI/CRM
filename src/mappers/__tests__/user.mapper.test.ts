import type { User } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toUserDTO } from "@/src/mappers/user.mapper";

const baseUser: User = {
  id: "user_1",
  name: "John",
  email: "john@example.com",
  emailVerified: true,
  image: null,
  deletionScheduledAt: null,
  anonymizedAt: null,
  acceptedTermsAt: new Date("2026-01-01T00:00:00.000Z"),
  acceptedPrivacyAt: new Date("2026-01-02T00:00:00.000Z"),
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-03T00:00:00.000Z"),
};

describe("toUserDTO", () => {
  it("serializa datas em ISO e preserva os campos", () => {
    const dto = toUserDTO(baseUser);
    expect(dto).toEqual({
      id: "user_1",
      name: "John",
      email: "john@example.com",
      emailVerified: true,
      image: null,
      acceptedTermsAt: "2026-01-01T00:00:00.000Z",
      acceptedPrivacyAt: "2026-01-02T00:00:00.000Z",
      deletionScheduledAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-03T00:00:00.000Z",
    });
  });

  it("mantém null para datas opcionais ausentes", () => {
    const dto = toUserDTO({ ...baseUser, acceptedTermsAt: null });
    expect(dto.acceptedTermsAt).toBeNull();
  });
});
