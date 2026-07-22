"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { updateOrganization } from "@/lib/settings/actions";
import { updateOrganizationSchema, type UpdateOrganizationInput } from "@/lib/settings/schema";
import { ORG_TYPES } from "@/lib/organizations/types";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrganizationSettingsFormProps {
  orgSlug: string;
  defaultValues: { name: string; type: string | null };
}

/**
 * Formulaire "Organisation" des Paramètres — nom + type, mêmes valeurs et
 * traductions que l'onboarding (`onboarding.orgTypes.<type>`). Le logo est
 * volontairement absent (reporté V1.1).
 */
export function OrganizationSettingsForm({
  orgSlug,
  defaultValues,
}: OrganizationSettingsFormProps) {
  const t = useTranslations("settings.organization");
  const tOnboarding = useTranslations("onboarding");
  const [isPending, startTransition] = useTransition();

  const form = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      name: defaultValues.name,
      type: (defaultValues.type as UpdateOrganizationInput["type"]) ?? undefined,
    },
  });

  function onSubmit(values: UpdateOrganizationInput) {
    startTransition(async () => {
      const result = await updateOrganization(orgSlug, values);
      if (result.ok) {
        toast.success(t("success"));
        return;
      }
      if (result.error === "forbidden") {
        toast.error(t("errors.forbidden"));
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

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("type")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ORG_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {tOnboarding(`orgTypes.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-sm text-muted-foreground">{t("logoPlaceholder")}</p>

            <Button type="submit" disabled={isPending}>
              {isPending ? t("saving") : t("save")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
