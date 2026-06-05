import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/cron/email-sync-tick/route";

const SECRET = "test-cron-secret-1234567890";

function cronReq(secret = SECRET): NextRequest {
  return new NextRequest("http://localhost/api/cron/email-sync-tick", {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });
}

describe("/api/cron/email-sync-tick (e2e)", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", SECRET);
  });

  it("401 com secret errado", async () => {
    const res = await POST(cronReq("errado"));
    expect(res.status).toBe(401);
  });

  it("200 e processa as contas (sem contas → zero)", async () => {
    const res = await POST(cronReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toMatchObject({ imported: 0, errors: 0 });
  });
});
