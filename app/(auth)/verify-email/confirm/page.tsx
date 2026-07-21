"use client";

import { useEffect } from "react";
import { MailCheck, MailWarning } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  buildVerifyEmailCallbackURL,
  isVerifyEmailNext,
  maskEmail,
  resolveVerifyEmailNextPath,
} from "@/lib/auth/verify-email";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";

const AUTO_REDIRECT_DELAY_MS = 1500;

/**
 * Callback du lien de vérification (chantier 3) — `callbackURL` transmis à
 * Better-Auth (`buildVerifyEmailCallbackURL`). Better-Auth ajoute lui-même
 * `?error=TOKEN_EXPIRED`/`INVALID_TOKEN` à cette URL en cas d'échec
 * (`GET /api/auth/verify-email`), sans quoi la vérification a réussi et la
 * session est déjà posée (`autoSignInAfterVerification`).
 */
export default function VerifyEmailConfirmPage() {
  const t = useTranslations("auth.verifyEmail");
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") ?? "";
  const nextParam = searchParams.get("next");
  const next = isVerifyEmailNext(nextParam) ? nextParam : "home";
  const nextPath = resolveVerifyEmailNextPath(next);
  const hasError = Boolean(searchParams.get("error"));

  useEffect(() => {
    if (hasError) return;
    const timeout = setTimeout(() => router.replace(nextPath), AUTO_REDIRECT_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [hasError, nextPath, router]);

  if (hasError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <MailWarning className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold text-foreground">
              {t("errorTitle")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("errorDescription")}
            </p>
          </div>
          {email && (
            <ResendVerificationButton
              email={email}
              callbackURL={buildVerifyEmailCallbackURL(email, next)}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-brand-subtle text-primary">
          <MailCheck className="size-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold text-foreground">
            {t("successTitle")}
          </h1>
          {email && (
            <p className="text-sm text-muted-foreground">
              {t("successDescription", { email: maskEmail(email) })}
            </p>
          )}
        </div>
        <Button render={<Link href={nextPath} />}>{t("continue")}</Button>
      </CardContent>
    </Card>
  );
}
