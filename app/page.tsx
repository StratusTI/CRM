import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { withBasePath } from "@/lib/api-url";
import { auth } from "@/src/lib/auth";
import { MembershipRepository } from "@/src/repositories/membership.repository";

// Next 16.2.6 não prefixa basePath nos `redirect()` server-side em runtime
// (rotas estão registradas sem /crm no manifest). Usamos `withBasePath()`
// pra montar a Location header com o prefixo certo.
export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect(withBasePath("/sign-in"));

  const memberships = await MembershipRepository.listByUser(session.user.id);
  if (memberships.ok && memberships.value.length > 0) {
    redirect(withBasePath(`/${memberships.value[0].workspace.slug}`));
  }
  redirect(withBasePath("/create-workspace"));
}
