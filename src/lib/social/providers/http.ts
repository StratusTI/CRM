import { socialOauthFailed } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";

/** POST `application/x-www-form-urlencoded` e devolve o JSON, ou `socialOauthFailed`. */
export async function postForm<T>(
  url: string,
  body: Record<string, string>,
  headers: Record<string, string> = {},
): Promise<Result<T>> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        ...headers,
      },
      body: new URLSearchParams(body).toString(),
    });
    if (!response.ok) {
      console.error(
        "[social] POST falhou",
        url,
        response.status,
        (await response.text().catch(() => "")).slice(0, 500),
      );
      return err(socialOauthFailed());
    }
    return ok((await response.json()) as T);
  } catch (error) {
    console.error("[social] POST erro de rede", url, error);
    return err(socialOauthFailed());
  }
}

/** GET autenticado por Bearer (ou sem) e devolve o JSON, ou `socialOauthFailed`. */
export async function getJson<T>(
  url: string,
  accessToken?: string,
  extraHeaders: Record<string, string> = {},
): Promise<Result<T>> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        ...extraHeaders,
      },
    });
    if (!response.ok) {
      console.error(
        "[social] GET falhou",
        url,
        response.status,
        (await response.text().catch(() => "")).slice(0, 500),
      );
      return err(socialOauthFailed());
    }
    return ok((await response.json()) as T);
  } catch (error) {
    console.error("[social] GET erro de rede", url, error);
    return err(socialOauthFailed());
  }
}

/** `expires_in` (segundos) → `Date` absoluta, ou `null` quando ausente. */
export function expiresInToDate(expiresIn: unknown): Date | null {
  return typeof expiresIn === "number" && expiresIn > 0
    ? new Date(Date.now() + expiresIn * 1000)
    : null;
}
