import { createHmac, randomBytes } from "node:crypto";
import type { EmailAccount, MailProvider } from "@prisma/client";
import { BETTER_AUTH_SECRET, BETTER_AUTH_URL } from "@/lib/env/_server";
import {
  socialConnectionNotFound,
  socialOauthFailed,
  socialProviderNotConfigured,
  socialStateInvalid,
} from "@/src/errors/app-error";
import {
  buildMailAuthorizeUrl,
  exchangeMailCode,
  mailProviderConfigured,
} from "@/src/lib/email-sync/oauth";
import { err, ok, type Result } from "@/src/lib/result";
import { encryptToken, isTokenCryptoConfigured } from "@/src/lib/social/crypto";
import {
  type EmailMessageDTO,
  toEmailMessageDTO,
} from "@/src/mappers/email-message.mapper";
import { EmailAccountRepository } from "@/src/repositories/email-account.repository";
import { EmailMessageRepository } from "@/src/repositories/email-message.repository";
import { EmailSyncService } from "@/src/services/email-sync.service";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const STATE_TTL_MS = 10 * 60 * 1000;

/** URL de callback fixa (o slug viaja no state). */
function callbackUrl(): string {
  const base = BETTER_AUTH_URL.replace(/\/$/, "");
  return `${base}${BASE_PATH}/api/email/callback`;
}

type StatePayload = {
  slug: string;
  provider: MailProvider;
  nonce: string;
  exp: number;
};

function signState(payloadB64: string): string {
  return createHmac("sha256", BETTER_AUTH_SECRET)
    .update(payloadB64)
    .digest("base64url");
}

function createState(slug: string, provider: MailProvider): string {
  const payload: StatePayload = {
    slug,
    provider,
    nonce: randomBytes(16).toString("base64url"),
    exp: Date.now() + STATE_TTL_MS,
  };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${b64}.${signState(b64)}`;
}

function verifyState(state: string): Result<StatePayload> {
  const [b64, sig] = state.split(".");
  if (!b64 || !sig || signState(b64) !== sig) return err(socialStateInvalid());
  try {
    const payload = JSON.parse(
      Buffer.from(b64, "base64url").toString("utf8"),
    ) as StatePayload;
    if (payload.exp < Date.now()) return err(socialStateInvalid());
    return ok(payload);
  } catch {
    return err(socialStateInvalid());
  }
}

export type EmailAccountDTO = {
  id: string;
  provider: MailProvider;
  email: string;
  lastSyncedAt: string | null;
};

function toDTO(account: EmailAccount): EmailAccountDTO {
  return {
    id: account.id,
    provider: account.provider,
    email: account.email,
    lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
  };
}

export const EmailAccountService = {
  /** Inicia o OAuth: devolve a URL de autorização do provedor. */
  async beginConnect(
    userId: string,
    slug: string,
    provider: MailProvider,
  ): Promise<Result<{ authorizeUrl: string }>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "EDIT",
    });
    if (!ws.ok) return ws;
    if (!isTokenCryptoConfigured() || !mailProviderConfigured(provider)) {
      return err(socialProviderNotConfigured());
    }
    const url = buildMailAuthorizeUrl(
      provider,
      callbackUrl(),
      createState(slug, provider),
    );
    return ok({ authorizeUrl: url });
  },

  /** Conclui o OAuth no callback: troca o code e salva a conta. */
  async completeConnect(
    userId: string,
    args: { code: string; state: string },
  ): Promise<Result<{ slug: string }>> {
    const parsed = verifyState(args.state);
    if (!parsed.ok) return parsed;
    const { slug, provider } = parsed.value;

    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "EDIT",
    });
    if (!ws.ok) return ws;
    if (!isTokenCryptoConfigured()) {
      return err(socialOauthFailed("Cifragem de tokens não configurada"));
    }

    const tokens = await exchangeMailCode(provider, args.code, callbackUrl());
    if (!tokens.ok) return tokens;
    if (!tokens.value.email) {
      return err(socialOauthFailed("Não foi possível identificar o e-mail"));
    }

    const saved = await EmailAccountRepository.upsert({
      workspaceId: ws.value,
      userId,
      provider,
      email: tokens.value.email,
      accessToken: encryptToken(tokens.value.accessToken),
      refreshToken: tokens.value.refreshToken
        ? encryptToken(tokens.value.refreshToken)
        : null,
      tokenExpiresAt: tokens.value.expiresAt,
      scope: tokens.value.scope,
    });
    if (!saved.ok) return saved;
    return ok({ slug });
  },

  /** Contas conectadas do usuário na workspace. */
  async list(userId: string, slug: string): Promise<Result<EmailAccountDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "VIEW",
    });
    if (!ws.ok) return ws;
    const accounts = await EmailAccountRepository.listByUser(ws.value, userId);
    if (!accounts.ok) return accounts;
    return ok(accounts.value.map(toDTO));
  },

  async disconnect(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "EDIT",
    });
    if (!ws.ok) return ws;
    return EmailAccountRepository.delete(id, ws.value);
  },

  /** Carrega uma conta garantindo escopo de workspace. */
  async loadAccount(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<EmailAccount>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "EDIT",
    });
    if (!ws.ok) return ws;
    const found = await EmailAccountRepository.findById(id);
    if (!found.ok) return found;
    if (!found.value || found.value.workspaceId !== ws.value) {
      return err(socialConnectionNotFound());
    }
    return ok(found.value);
  },

  /** Importa agora os e-mails/eventos da conta. */
  async syncNow(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<{ imported: number; matched: number }>> {
    const account = await EmailAccountService.loadAccount(userId, slug, id);
    if (!account.ok) return account;
    return EmailSyncService.importAccount(account.value);
  },

  /** Envia um e-mail pela conta conectada. */
  async send(
    userId: string,
    slug: string,
    id: string,
    input: { to: string[]; subject: string; body: string },
  ): Promise<Result<true>> {
    const account = await EmailAccountService.loadAccount(userId, slug, id);
    if (!account.ok) return account;
    return EmailSyncService.sendEmail(account.value, input);
  },

  /** E-mails vinculados a um registro (timeline de pessoa/oportunidade). */
  async listForRecord(
    userId: string,
    slug: string,
    entity: "person" | "opportunity",
    recordId: string,
  ): Promise<Result<EmailMessageDTO[]>> {
    const resource = entity === "person" ? "people" : "opportunities";
    const ws = await resolveWorkspaceId(userId, slug, {
      resource,
      action: "VIEW",
    });
    if (!ws.ok) return ws;
    const messages =
      entity === "person"
        ? await EmailMessageRepository.listByPerson(ws.value, recordId)
        : await EmailMessageRepository.listByOpportunity(ws.value, recordId);
    if (!messages.ok) return messages;
    return ok(messages.value.map(toEmailMessageDTO));
  },
};
