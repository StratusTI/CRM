import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionApi, headersMock } = vi.hoisted(() => ({
  getSessionApi: vi.fn(),
  headersMock: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("@/src/lib/auth", () => ({
  auth: { api: { getSession: getSessionApi } },
}));

import { getAuthSession } from "@/src/lib/auth-session";

describe("getAuthSession", () => {
  beforeEach(() => {
    getSessionApi.mockReset();
    headersMock.mockReset();
  });

  it("encaminha os headers da requisição e retorna ok com a sessão", async () => {
    const requestHeaders = new Headers({ cookie: "session=abc" });
    headersMock.mockResolvedValue(requestHeaders);
    const session = { user: { id: "user_1" } };
    getSessionApi.mockResolvedValue(session);

    const result = await getAuthSession();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(session);
    expect(getSessionApi).toHaveBeenCalledWith({ headers: requestHeaders });
  });

  it("retorna UNAUTHORIZED quando não há sessão", async () => {
    headersMock.mockResolvedValue(new Headers());
    getSessionApi.mockResolvedValue(null);

    const result = await getAuthSession();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHORIZED");
  });
});
