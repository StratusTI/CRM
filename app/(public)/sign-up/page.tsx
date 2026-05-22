import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/signup-form";

export default function SignUpPage() {
  return (
    <AuthShell tagline="Comece em minutos. Sem cartão de crédito.">
      <SignupForm />
    </AuthShell>
  );
}
