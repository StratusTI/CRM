import { redirect } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import { withBasePath } from "@/lib/api-url";
import { getAuthSession } from "@/src/lib/auth-session";
import { UserRepository } from "@/src/repositories/user.repository";

// Sob `cacheComponents`, todo acesso dinâmico (headers/sessão/DB) precisa
// ficar dentro de um `<Suspense>`, senão a rota não consegue prerenderizar
// e o resultado da navegação vira indefinido — o que causava o redirect de
// consentimento ficar "preso" num payload prefetchado e exigir clicar duas
// vezes. Com o gate dentro do Suspense ele roda no tempo da requisição e
// sempre lê o estado de consentimento recém-gravado.
export default function PrivateLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ConsentGate>{children}</ConsentGate>
    </Suspense>
  );
}

async function ConsentGate({ children }: { children: ReactNode }) {
  const session = await getAuthSession();
  if (!session.ok) redirect(withBasePath("/sign-in"));

  // Consent gate: any authenticated path under (private) requires
  // accepted terms + privacy. Covers OAuth signup (which skips the
  // checkbox form) and any curl-bypass of the email signup. Failure
  // to load the user is treated as no-consent — safer to over-prompt
  // than to silently let an unconsented user through.
  const user = await UserRepository.findById(session.value.user.id);
  if (
    !user.ok ||
    !user.value.acceptedTermsAt ||
    !user.value.acceptedPrivacyAt
  ) {
    redirect(withBasePath("/consent"));
  }

  return <>{children}</>;
}
