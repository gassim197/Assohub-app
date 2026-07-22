"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { organization } from "@/lib/auth/client";
import { ORG_TYPES } from "@/lib/organizations/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const onboardingSchema = z.object({
  name: z.string().min(2),
  type: z.enum(ORG_TYPES),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

/**
 * Formulaire de création d'organisation (flow d'onboarding). Réutilisé à la
 * fois pour la toute première organisation d'un utilisateur (inscription) et
 * pour une création "secondaire" depuis le switcher d'organisations (session
 * 8B) — `cancelHref` n'est fourni que dans ce second cas (l'utilisateur a
 * déjà au moins une organisation où revenir), sinon aucune échappatoire n'a
 * de sens.
 */
export function OnboardingForm({ cancelHref }: { cancelHref?: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { name: "", type: undefined },
  });

  async function onSubmit(values: OnboardingValues) {
    setServerError(null);
    const result = await organization.create({
      name: values.name,
      slug: slugify(values.name),
      metadata: { type: values.type },
    });
    if (result.error) {
      setServerError(t("auth.genericError"));
      return;
    }
    router.push(`/${result.data?.slug}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("onboarding.title")}</CardTitle>
        <CardDescription>{t("onboarding.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("onboarding.orgName")}</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("onboarding.orgType")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={t("onboarding.orgTypePlaceholder")}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ORG_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`onboarding.orgTypes.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError && (
              <p className="text-destructive text-sm">{serverError}</p>
            )}
            <div className="flex gap-2">
              {cancelHref ? (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={form.formState.isSubmitting}
                  render={<Link href={cancelHref} />}
                >
                  {t("onboarding.cancel")}
                </Button>
              ) : null}
              <Button
                type="submit"
                className="flex-1"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? t("onboarding.creating")
                  : t("onboarding.submit")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
