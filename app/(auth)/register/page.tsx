"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { signUp, sendVerificationEmail } from "@/lib/auth/client";
import { buildVerifyEmailCallbackURL } from "@/lib/auth/verify-email";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Au moins une majuscule requise")
    .regex(/[0-9]/, "Au moins un chiffre requis"),
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const t = useTranslations();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: RegisterValues) {
    setServerError(null);
    const result = await signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
    });
    if (result.error) {
      setServerError(t("auth.genericError"));
      return;
    }
    // `sendOnSignUp: false` (lib/auth/index.ts) : l'envoi de l'email de
    // vérification est déclenché explicitement ici plutôt que par
    // Better-Auth, pour ne pas le déclencher aussi pour les invités
    // auto-vérifiés (registerAndJoin). Le compte existe déjà à ce stade : un
    // échec d'envoi ne doit pas bloquer la redirection (l'utilisateur pourra
    // renvoyer l'email depuis la page suivante).
    try {
      const callbackURL = buildVerifyEmailCallbackURL(values.email, "home");
      await sendVerificationEmail({ email: values.email, callbackURL });
    } catch (error) {
      console.error("[auth] échec d'envoi de l'email de vérification", error);
    }
    router.push(
      `/verify-email?email=${encodeURIComponent(values.email)}&next=home`,
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("auth.createAccount")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleSignInButton callbackURL="/" />
        <AuthDivider />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.fullName")}</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                  <FormLabel>{t("auth.password")}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t("auth.passwordRules")}</FormDescription>
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
                : t("auth.signUp")}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        {t("auth.alreadyHaveAccount")}&nbsp;
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
          {t("auth.signIn")}
        </Link>
      </CardFooter>
    </Card>
  );
}
