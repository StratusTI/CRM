import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";

export default function SignInPage() {
  return (
    <AuthShell tagline="Suas empresas, contatos e negócios em um só lugar.">
      <LoginForm />
    </AuthShell>
  );
}
