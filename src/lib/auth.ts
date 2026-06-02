import { dash } from "@better-auth/infra";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} from "@/lib/env/_server";
import { prisma } from "@/src/lib/prisma";
import { getFromAddress, getResendClient } from "@/src/lib/resend";

// Em prod a app é servida sob `/crm` (Next basePath). O better-auth precisa
// saber pra construir callback URLs corretas e validar origem das chamadas.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  plugins: [dash()],
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  basePath: `${BASE_PATH}/api/auth`,
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      const resend = getResendClient();
      const from = getFromAddress();
      if (!resend || !from) return;
      await resend.emails.send({
        from,
        to: user.email,
        subject: "Redefinição de senha — Nexo CRM",
        html: `
          <p>Olá, ${user.name}.</p>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
          <p><a href="${url}" style="color:#6366f1">Clique aqui para criar uma nova senha</a></p>
          <p>O link expira em 1 hora. Se você não solicitou a redefinição, ignore este e-mail.</p>
        `,
      });
    },
  },
  socialProviders:
    GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined,
});
