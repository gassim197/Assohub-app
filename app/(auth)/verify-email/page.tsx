"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  buildVerifyEmailCallbackURL,
  isVerifyEmailNext,
  maskEmail,
} from "@/lib/auth/verify-email";
import { Card, CardContent } from "@/components/ui/card";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";

/**
 * "Vérifiez votre boîte mail" (chantier 3) — atterrissage après une
 * inscription email/password normale ou via lien partageable (`/join/[token]`),
 * tant que `requireEmailVerification` bloque la connexion.
 */
export default function VerifyEmailPendingPage() {
  const t = useTranslations("auth.verifyEmail");
  const searchParams = useSearchParams();

  const email = searchParams.get("email") ?? "";
  const nextParam = searchParams.get("next");
  const next = isVerifyEmailNext(nextParam) ? nextParam : "home";

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-brand-subtle text-primary">
          <Mail className="size-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold text-foreground">
            {t("pendingTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("pendingDescription", { email: maskEmail(email) })}
          </p>
        </div>

        {email && (
          <ResendVerificationButton
            email={email}
            callbackURL={buildVerifyEmailCallbackURL(email, next)}
          />
        )}

        <Link
          href="/login"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {t("backToLogin")}
        </Link>
      </CardContent>
    </Card>
  );
}
