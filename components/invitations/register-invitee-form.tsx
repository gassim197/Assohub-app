"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { registerAndJoin } from "@/lib/invitations/actions";
import { buildRegisterInviteeSchema } from "@/lib/invitations/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface RegisterInviteeFormValues {
  fullName: string;
  phoneNumber: string;
  password: string;
}

/**
 * Formulaire d'inscription d'un invité (volet 2 de la 4B, checkpoint 2).
 * L'email n'est pas un champ éditable : c'est celui de l'invitation, affiché
 * pour confirmation mais jamais soumis (le serveur le relit depuis le token).
 *
 * En cas de succès, `registerAndJoin` termine par un `redirect` serveur : il
 * n'y a rien à faire côté client dans ce cas (pas de retour, la navigation
 * est prise en charge par Next). Seules les erreurs reviennent ici.
 */
export function RegisterInviteeForm({
  token,
  email,
  defaultFullName,
}: {
  token: string;
  email: string;
  defaultFullName: string;
}) {
  const t = useTranslations("invitations.accept.register");
  const tAuth = useTranslations("auth");
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);

  const schema = useMemo(
    () =>
      buildRegisterInviteeSchema({
        nameMin: t("errors.nameMin"),
        phoneInvalid: t("errors.phoneInvalid"),
        passwordMin: t("errors.passwordMin"),
        passwordUppercase: t("errors.passwordUppercase"),
        passwordNumber: t("errors.passwordNumber"),
      }),
    [t],
  );

  const form = useForm<RegisterInviteeFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: {
      fullName: defaultFullName,
      phoneNumber: "",
      password: "",
    },
  });

  function onSubmit(values: RegisterInviteeFormValues) {
    setServerError(null);
    setEmailTaken(false);
    startTransition(async () => {
      const result = await registerAndJoin(token, values);
      // Le succès ne revient jamais ici (redirect serveur) : à ce point,
      // `result` est nécessairement une erreur.
      if (result.error === "phoneInvalid") {
        form.setError("phoneNumber", { message: t("errors.phoneInvalid") });
      } else if (result.error === "emailTaken") {
        setEmailTaken(true);
      } else if (result.error === "invalidInvitation") {
        setServerError(t("errors.invalidInvitation"));
      } else {
        setServerError(t("errors.generic"));
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invitee-email">{tAuth("email")}</Label>
              <Input
                id="invitee-email"
                type="email"
                value={email}
                disabled
                readOnly
              />
            </div>

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
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("phone")}</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+224 6 11 55 15 20"
                      autoComplete="tel"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {t("phoneHint")}
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
                {t("errors.emailTaken")}{" "}
                <Link
                  href={`/login?email=${encodeURIComponent(email)}`}
                  className="underline underline-offset-4"
                >
                  {t("errors.emailTakenCta")}
                </Link>
              </p>
            )}
            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t("submitting") : t("submit")}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <Link
          href={`/invitations/accept/${token}`}
          className="underline-offset-4 hover:underline"
        >
          {t("back")}
        </Link>
      </CardFooter>
    </Card>
  );
}
