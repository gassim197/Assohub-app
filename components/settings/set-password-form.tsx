"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { setUserPassword } from "@/lib/settings/actions";
import { setPasswordSchema, type SetPasswordInput } from "@/lib/settings/schema";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const DEFAULT_VALUES: SetPasswordInput = { newPassword: "", confirmPassword: "" };

/**
 * Sous-section "Définir un mot de passe" — compte inscrit uniquement via
 * Google (`hasCredentialAccount` a renvoyé `false`), pas de mot de passe
 * actuel à demander.
 */
export function SetPasswordForm({ orgSlug }: { orgSlug: string }) {
  const t = useTranslations("settings.password");
  const [isPending, startTransition] = useTransition();

  const form = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: DEFAULT_VALUES,
  });

  function onSubmit(values: SetPasswordInput) {
    startTransition(async () => {
      const result = await setUserPassword(orgSlug, values);
      if (result.ok) {
        toast.success(t("setSuccess"));
        form.reset(DEFAULT_VALUES);
        return;
      }
      toast.error(t("errors.generic"));
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("setTitle")}</CardTitle>
        <CardDescription>{t("setSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("newPassword")}</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormDescription>{t("passwordRules")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("confirmPassword")}</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? t("saving") : t("setSave")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
