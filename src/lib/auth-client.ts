import { sentinelClient } from "@better-auth/infra/client";
import { createAuthClient } from "better-auth/react";

// Em prod a app é servida sob `/crm` (Next basePath). O better-auth client
// monta as URLs por conta própria — sem `basePath` aqui ele bate em
// `${origin}/api/auth/...` (404) em vez de `${origin}/crm/api/auth/...`.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const authClient = createAuthClient({
  basePath: `${BASE_PATH}/api/auth`,
  plugins: [sentinelClient()],
});
