"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { signIn } from "@/lib/auth/client";
import { callAuth, requestErrorMessageKey } from "@/lib/errors/request-error";
import { SlowRequestHint } from "@/components/layout/slow-request-hint";
import { buildVerifyEmailCallbackURL } from "@/lib/auth/verify-email";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AuthDivider } from "@/components/auth/auth-divider";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginValues = z.infer<typeof loginSchema>;

/** Codes Better-Auth expliqués par ce formulaire ; tout autre code = panne. */
const LOGIN_ERROR_CODES = [
  "INVALID_EMAIL_OR_PASSWORD",
  "INVALID_EMAIL",
  "INVALID_PASSWORD",
  "USER_NOT_FOUND",
  "CREDENTIAL_ACCOUNT_NOT_FOUND",
  "EMAIL_NOT_VERIFIED",
  "VALIDATION_ERROR",
] as const;

/**
 * `redirect` vient de l'URL (lien "Se connecter et rejoindre" d'une
 * invitation, volet 2 de la 4B) : on n'accepte qu'un chemin relatif interne
 * pour écarter l'open redirect (`//evil.com`, `https://...`).
 */
function safeRedirect(value: string | null): string | null {
  if (!value) return null;
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const redirectTo = safeRedirect(searchParams.get("redirect"));
  const prefillEmail = searchParams.get("email") ?? "";
  const oauthErrorCode = searchParams.get("error");

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: prefillEmail, password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    setUnverifiedEmail(null);
    const result = await callAuth(
      () => signIn.email({ email: values.email, password: values.password }),
      LOGIN_ERROR_CODES,
    );
    if (!result.ok) {
      if (result.kind !== "auth") {
        // Panne réseau ou serveur : ne jamais laisser croire à un mauvais mot de passe.
        setServerError(t(`common.${requestErrorMessageKey(result.kind)}`));
      } else if (result.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(values.email);
      } else {
        setServerError(t("auth.invalidCredentials"));
      }
      return;
    }
    router.push(redirectTo ?? "/");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("auth.signIn")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {oauthErrorCode && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {oauthErrorCode === "account_not_linked"
              ? t("auth.oauthAccountNotLinked")
              : t("auth.oauthGenericError")}
          </p>
        )}
        <GoogleSignInButton callbackURL={redirectTo ?? "/"} />
        <AuthDivider />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.email")}</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>{t("auth.password")}</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-muted-foreground text-xs underline-offset-4 hover:underline hover:text-foreground"
                    >
                      {t("auth.forgotPassword")}
                    </Link>
                  </div>
                  <FormControl>
                    <PasswordInput
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError && (
              <p className="text-destructive text-sm">{serverError}</p>
            )}
            {unverifiedEmail && (
              <div className="space-y-2 rounded-md bg-warning/10 p-3 text-sm text-foreground">
                <p>{t("auth.emailNotVerified")}</p>
                <ResendVerificationButton
                  email={unverifiedEmail}
                  callbackURL={buildVerifyEmailCallbackURL(unverifiedEmail, "home")}
                />
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? t("common.loading")
                : t("auth.signIn")}
            </Button>
            <SlowRequestHint pending={form.formState.isSubmitting} className="text-center" />
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        {t("auth.noAccount")}&nbsp;
        <Link href="/register" className="text-foreground underline-offset-4 hover:underline">
          {t("auth.signUp")}
        </Link>
      </CardFooter>
    </Card>
  );
}
