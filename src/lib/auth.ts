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
  emailAndPassword: { enabled: true },
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
