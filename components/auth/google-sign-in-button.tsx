"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth/client";
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
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    setIsPending(true);
    await authClient.signIn.social({
      provider: "google",
      callbackURL,
      errorCallbackURL,
    });
    // En cas d'échec avant même la redirection vers Google (réseau, config
    // provider absente...), `signIn.social` ne redirige jamais et on doit
    // pouvoir recliquer.
    setIsPending(false);
  }

  return (
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
  );
}
