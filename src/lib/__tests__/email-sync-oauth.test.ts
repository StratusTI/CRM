import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildMailAuthorizeUrl,
  mailProviderConfigured,
} from "@/src/lib/email-sync/oauth";

describe("email-sync oauth", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "x.apps.googleusercontent.com");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "GOCSPX-secret");
    vi.stubEnv("MICROSOFT_CLIENT_ID", "");
    vi.stubEnv("MICROSOFT_CLIENT_SECRET", "");
  });

  it("mailProviderConfigured reflete as credenciais do env", () => {
    expect(mailProviderConfigured("GOOGLE")).toBe(true);
    expect(mailProviderConfigured("MICROSOFT")).toBe(false);
  });

  it("buildMailAuthorizeUrl monta a URL do Google com escopos", () => {
    const url = buildMailAuthorizeUrl("GOOGLE", "https://app/cb", "state-1");
    expect(url).toContain("accounts.google.com");
    expect(url).toContain("access_type=offline");
    expect(decodeURIComponent(url)).toContain("gmail.send");
    expect(url).toContain("state=state-1");
  });

  it("buildMailAuthorizeUrl monta a URL da Microsoft", () => {
    const url = buildMailAuthorizeUrl("MICROSOFT", "https://app/cb", "s2");
    expect(url).toContain("login.microsoftonline.com");
    expect(decodeURIComponent(url)).toContain("Mail.Send");
  });
});
