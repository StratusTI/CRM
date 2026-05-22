"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function useAcceptConsent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function acceptConsent(): Promise<boolean> {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/users/me/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptTerms: true, acceptPrivacy: true }),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        setError(
          json?.message ?? "Não foi possível registrar o consentimento.",
        );
        return false;
      }

      router.replace("/post-auth");
      return true;
    } catch {
      setError("Erro de rede. Tente novamente.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  return { acceptConsent, isLoading, error };
}
