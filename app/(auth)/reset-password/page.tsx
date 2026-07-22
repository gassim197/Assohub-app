"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { KeyRound, ShieldAlert } from "lucide-react";

import { resetPassword } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8)
      .regex(/[A-Z]/, "Au moins une majuscule requise")
      .regex(/[0-9]/, "Au moins un chiffre requis"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/**
 * Callback du lien "mot de passe oublié" — le token arrive en query param
 * (`?token=...`), pas en segment dynamique : Better-Auth redirige lui-même
 * vers `redirectTo` (ici `/reset-password`, transmis à `requestPasswordReset`)
 * en y ajoutant `?token=...` après validation de l'expiration côté serveur
 * (`GET /api/auth/reset-password/:token`). Si le token était déjà expiré à ce
 * moment-là, Better-Auth redirige avec `?error=INVALID_TOKEN` à la place.
 */
export default function ResetPasswordPage() {
  const t = useTranslations("auth.resetPasswordPage");
  const searchParams = useSearchParams();
  const [success, setSuccess] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);

  const token = searchParams.get("token");
  const hasUpstreamError = Boolean(searchParams.get("error"));

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordValues) {
    if (!token) {
      setInvalidToken(true);
      return;
    }
    const result = await resetPassword({
      newPassword: values.newPassword,
      token,
    });
    if (result.error) {
      if (result.error.code === "INVALID_TOKEN") {
        setInvalidToken(true);
      } else {
        form.setError("newPassword", { message: t("genericError") });
      }
      return;
    }
    setSuccess(true);
  }

  if (invalidToken || hasUpstreamError || !token) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold text-foreground">
              {t("invalidTokenTitle")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("invalidTokenDescription")}
            </p>
          </div>
          <Button render={<Link href="/forgot-password" />}>
            {t("requestNewLink")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-brand-subtle text-primary">
            <KeyRound className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold text-foreground">
              {t("successTitle")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("successDescription")}
            </p>
          </div>
          <Button render={<Link href="/login" />}>{t("continueToLogin")}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
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
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? t("submitting") : t("submit")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
