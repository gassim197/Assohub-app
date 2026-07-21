"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AuthDivider } from "@/components/auth/auth-divider";
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

  const redirectTo = safeRedirect(searchParams.get("redirect"));
  const prefillEmail = searchParams.get("email") ?? "";
  const oauthErrorCode = searchParams.get("error");

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: prefillEmail, password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    const result = await signIn.email({
      email: values.email,
      password: values.password,
    });
    if (result.error) {
      setServerError(t("auth.invalidCredentials"));
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
                    <span className="text-muted-foreground text-xs">
                      {t("auth.forgotPassword")}
                    </span>
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
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? t("common.loading")
                : t("auth.signIn")}
            </Button>
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
