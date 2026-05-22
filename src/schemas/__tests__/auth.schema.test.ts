import { describe, expect, it } from "vitest";
import { SignInSchema, SignUpSchema } from "@/src/schemas/auth.schema";

describe("SignInSchema", () => {
  it("aceita email e senha válidos", () => {
    const result = SignInSchema.safeParse({
      email: "user@example.com",
      password: "qualquer-coisa",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita email inválido", () => {
    const result = SignInSchema.safeParse({
      email: "não-é-email",
      password: "qualquer-coisa",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita senha vazia", () => {
    const result = SignInSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("SignUpSchema", () => {
  const validInput = {
    name: "John Doe",
    email: "user@example.com",
    password: "12345678",
    confirmPassword: "12345678",
  };

  it("aceita input válido", () => {
    expect(SignUpSchema.safeParse(validInput).success).toBe(true);
  });

  it("faz trim do nome", () => {
    const result = SignUpSchema.safeParse({ ...validInput, name: "  John  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("John");
    }
  });

  it("rejeita nome vazio", () => {
    const result = SignUpSchema.safeParse({ ...validInput, name: "   " });
    expect(result.success).toBe(false);
  });

  it("rejeita senha com menos de 8 caracteres", () => {
    const result = SignUpSchema.safeParse({
      ...validInput,
      password: "1234",
      confirmPassword: "1234",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita quando as senhas não coincidem, apontando confirmPassword", () => {
    const result = SignUpSchema.safeParse({
      ...validInput,
      confirmPassword: "diferente",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });
});
