"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth/client";
import { callAuth, requestErrorMessageKey, type RequestFailureKind } from "@/lib/errors/request-error";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/auth/google-icon";

export function GoogleSignInButton({
  callbackURL = "/",
  errorCallbackURL = "/login?error=account_not_linked",
}: {
  callbackURL?: string;
  errorCallbackURL?: string;
}) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const [isPending, setIsPending] = useState(false);
  const [failure, setFailure] = useState<RequestFailureKind | null>(null);

  async function handleClick() {
    setIsPending(true);
    setFailure(null);
    // Aucun code n'est une erreur « métier » ici : tout échec avant la
    // redirection vers Google est une panne (réseau, serveur, configuration).
    const result = await callAuth(
      () => authClient.signIn.social({ provider: "google", callbackURL, errorCallbackURL }),
      [],
    );
    // En cas d'échec avant même la redirection vers Google, `signIn.social`
    // ne redirige jamais et on doit pouvoir recliquer.
    setIsPending(false);
    if (!result.ok && result.kind !== "auth") setFailure(result.kind);
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full bg-background"
        disabled={isPending}
        onClick={handleClick}
      >
        <GoogleIcon className="size-4" />
        {t("continueWithGoogle")}
      </Button>
      {failure ? (
        <p className="text-destructive text-sm">{tCommon(requestErrorMessageKey(failure))}</p>
      ) : null}
    </div>
  );
}
