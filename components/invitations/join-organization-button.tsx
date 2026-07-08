"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { joinExistingOrganization } from "@/lib/invitations/actions";
import { Button } from "@/components/ui/button";

/**
 * CTA "Rejoindre l'organisation" (volet 2 de la 4B, checkpoint 3a) : visiteur
 * déjà connecté avec l'email de l'invitation (arrivée via
 * `/login?redirect=...&email=...`, ou session déjà active). Le succès se
 * termine par un `redirect` serveur — on ne revient ici qu'en cas d'erreur.
 */
export function JoinOrganizationButton({ token }: { token: string }) {
  const t = useTranslations("invitations.accept");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await joinExistingOrganization(token);
      if (result.error) {
        setError(t("join.error"));
      }
    });
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <Button className="w-full" onClick={handleClick} disabled={isPending}>
        {isPending ? t("cta.joining") : t("cta.join")}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
