"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { updateProfile } from "@/lib/settings/actions";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/settings/schema";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface ProfileSettingsFormProps {
  orgSlug: string;
  defaultValues: { name: string; email: string };
}

/** Formulaire "Profil" — nom éditable, email en lecture seule (V1). */
export function ProfileSettingsForm({ orgSlug, defaultValues }: ProfileSettingsFormProps) {
  const t = useTranslations("settings.profile");
  const [isPending, startTransition] = useTransition();

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: defaultValues.name },
  });

  function onSubmit(values: UpdateProfileInput) {
    startTransition(async () => {
      const result = await updateProfile(orgSlug, values);
      if (result.ok) {
        toast.success(t("success"));
        return;
      }
      toast.error(t("errors.generic"));
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
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

        <div className="space-y-1.5">
          <Label className="text-muted-foreground">{t("email")}</Label>
          <Input value={defaultValues.email} disabled readOnly />
          <p className="text-xs text-muted-foreground">{t("emailHint")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
