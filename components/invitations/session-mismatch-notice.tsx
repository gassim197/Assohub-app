"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { signOut } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Cas non couvert littéralement par le brief mais nécessaire (volet 2 de la
 * 4B, checkpoint 3a) : un visiteur est déjà connecté, mais avec un compte
 * différent de l'email invité. On ne le laisse pas rejoindre au nom de
 * quelqu'un d'autre — il doit d'abord se déconnecter.
 */
export function SessionMismatchNotice({
  sessionEmail,
  invitationEmail,
}: {
  sessionEmail: string;
  invitationEmail: string;
}) {
  const t = useTranslations("invitations.accept");
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);
    await signOut();
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          {t("sessionMismatch.description", { sessionEmail, invitationEmail })}
        </p>
        <Button variant="outline" onClick={handleSignOut} disabled={isPending}>
          {isPending
            ? t("sessionMismatch.signingOut")
            : t("sessionMismatch.signOut")}
        </Button>
      </CardContent>
    </Card>
  );
}
