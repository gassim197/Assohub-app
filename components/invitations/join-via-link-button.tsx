"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { joinViaInviteLink } from "@/lib/invitations/actions";
import { Button } from "@/components/ui/button";

/**
 * CTA "Rejoindre l'organisation" pour un visiteur déjà connecté arrivant sur
 * `/join/[token]` (volet 4 de la 4B, checkpoint 2) — pendant de
 * `JoinOrganizationButton` pour le lien partageable. Le succès se termine par
 * un `redirect` serveur ; on ne revient ici qu'en cas d'erreur.
 */
export function JoinViaLinkButton({ token }: { token: string }) {
  const t = useTranslations("invitations.join");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await joinViaInviteLink(token);
      if (result.error) {
        setError(t("joinError"));
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
