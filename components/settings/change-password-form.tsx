"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { changeUserPassword } from "@/lib/settings/actions";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/settings/schema";
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

const DEFAULT_VALUES: ChangePasswordInput = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

/** Sous-section "Changer le mot de passe" — compte ayant déjà un mot de passe. */
export function ChangePasswordForm({ orgSlug }: { orgSlug: string }) {
  const t = useTranslations("settings.password");
  const [isPending, startTransition] = useTransition();

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: DEFAULT_VALUES,
  });

  function onSubmit(values: ChangePasswordInput) {
    startTransition(async () => {
      const result = await changeUserPassword(orgSlug, values);
      if (result.ok) {
        toast.success(t("success"));
        form.reset(DEFAULT_VALUES);
        return;
      }
      if (result.error === "invalidCurrentPassword") {
        form.setError("currentPassword", { message: t("errors.invalidCurrentPassword") });
      } else {
        toast.error(t("errors.generic"));
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("currentPassword")}</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              {isPending ? t("saving") : t("save")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
