"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { registerAndJoinViaLink } from "@/lib/invitations/actions";
import { buildRegisterViaLinkSchema } from "@/lib/invitations/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface RegisterViaLinkFormValues {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

/**
 * Formulaire d'inscription via lien d'invitation partageable (volet 4 de la
 * 4B, checkpoint 2) — pendant de `RegisterInviteeForm` pour le lien : `email`
 * y est un champ éditable (aucune invitation nommée n'en fixe la valeur à
 * l'avance), d'où `emailAlreadyExists` (brief point B) au lieu du
 * `emailTaken` du flow nominatif.
 */
export function RegisterViaLinkForm({ token }: { token: string }) {
  const t = useTranslations("invitations.join");
  const tAuth = useTranslations("auth");
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      buildRegisterViaLinkSchema({
        nameMin: t("register.errors.nameMin"),
        emailInvalid: t("register.errors.emailInvalid"),
        phoneInvalid: t("register.errors.phoneInvalid"),
        passwordMin: t("register.errors.passwordMin"),
        passwordUppercase: t("register.errors.passwordUppercase"),
        passwordNumber: t("register.errors.passwordNumber"),
      }),
    [t],
  );

  const form = useForm<RegisterViaLinkFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: { fullName: "", email: "", phoneNumber: "", password: "" },
  });

  function onSubmit(values: RegisterViaLinkFormValues) {
    setServerError(null);
    setEmailTaken(null);
    startTransition(async () => {
      const result = await registerAndJoinViaLink(token, values);
      // Le succès ne revient jamais ici (redirect serveur) : à ce point,
      // `result` est nécessairement une erreur.
      if (result.error === "phoneInvalid") {
        form.setError("phoneNumber", { message: t("register.errors.phoneInvalid") });
      } else if (result.error === "emailAlreadyExists") {
        setEmailTaken(values.email);
      } else if (result.error === "invalidLink") {
        setServerError(t("register.errors.invalidLink"));
      } else {
        setServerError(t("register.errors.generic"));
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tAuth("fullName")}</FormLabel>
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
                  <FormLabel>{tAuth("email")}</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("register.phone")}</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+224 6 11 55 15 20"
                      autoComplete="tel"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {t("register.phoneHint")}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tAuth("password")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{tAuth("passwordRules")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {emailTaken && (
              <p className="text-sm text-destructive">
                {tAuth("emailAlreadyUsed")}{" "}
                <Link
                  href={`/login?redirect=${encodeURIComponent(
                    `/join/${token}`,
                  )}&email=${encodeURIComponent(emailTaken)}`}
                  className="underline underline-offset-4"
                >
                  {tAuth("signIn")}
                </Link>
              </p>
            )}
            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t("cta.creating") : t("cta.registerAndJoin")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
