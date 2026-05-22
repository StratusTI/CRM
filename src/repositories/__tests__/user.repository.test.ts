import { describe, expect, it } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { UserRepository } from "@/src/repositories/user.repository";

describe("UserRepository (integração)", () => {
  it("findById retorna o usuário existente", async () => {
    const user = await createUser();
    const result = await UserRepository.findById(user.id);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.email).toBe(user.email);
  });

  it("findById retorna USER_NOT_FOUND quando não existe", async () => {
    const result = await UserRepository.findById("inexistente");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("USER_NOT_FOUND");
  });

  it("updateProfile altera nome e imagem", async () => {
    const user = await createUser();
    const result = await UserRepository.updateProfile(user.id, {
      name: "Novo Nome",
      image: "https://cdn.example.com/a.png",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("Novo Nome");
      expect(result.value.image).toBe("https://cdn.example.com/a.png");
    }
  });

  it("acceptConsent grava os dois timestamps", async () => {
    const user = await createUser();
    const at = new Date();
    const result = await UserRepository.acceptConsent(user.id, at);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.acceptedTermsAt).toEqual(at);
      expect(result.value.acceptedPrivacyAt).toEqual(at);
    }
  });

  it("scheduleDeletion e cancelDeletion atualizam o agendamento", async () => {
    const user = await createUser();
    const when = new Date();

    const scheduled = await UserRepository.scheduleDeletion(user.id, when);
    expect(scheduled.ok).toBe(true);
    if (scheduled.ok) expect(scheduled.value.deletionScheduledAt).toEqual(when);

    const cancelled = await UserRepository.cancelDeletion(user.id);
    expect(cancelled.ok).toBe(true);
    if (cancelled.ok) expect(cancelled.value.deletionScheduledAt).toBeNull();
  });
});
