"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { sendVerificationEmail } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

const RESEND_COOLDOWN_SECONDS = 60;

/** Renvoie l'email de vérification, avec anti-spam (1 renvoi / minute, chantier 3). */
export function ResendVerificationButton({
  email,
  callbackURL,
}: {
  email: string;
  callbackURL: string;
}) {
  const t = useTranslations("auth.verifyEmail");
  const [isPending, setIsPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    setIsPending(true);
    setSent(false);
    setFailed(false);
    const result = await sendVerificationEmail({ email, callbackURL });
    setIsPending(false);
    if (result.error) {
      setFailed(true);
      return;
    }
    setSent(true);
    startCooldown();
  }

  const disabled = isPending || cooldown > 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={handleResend}
      >
        {cooldown > 0
          ? t("resendCooldown", { seconds: cooldown })
          : t("resend")}
      </Button>
      {sent && (
        <p className="text-sm text-muted-foreground">{t("resendSuccess")}</p>
      )}
      {failed && (
        <p className="text-sm text-destructive">{t("resendError")}</p>
      )}
    </div>
  );
}
