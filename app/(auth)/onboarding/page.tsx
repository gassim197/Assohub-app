"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { organization } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const ORG_TYPES = [
  "student",
  "ngo",
  "community",
  "network",
  "other",
] as const;

const onboardingSchema = z.object({
  name: z.string().min(2),
  type: z.enum(ORG_TYPES),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
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

            <Controller
              control={form.control}
              name="type"
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor="org-type">{t("onboarding.orgType")}</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="org-type" className="w-full">
                      <SelectValue
                        placeholder={t("onboarding.orgTypePlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`onboarding.orgTypes.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-destructive text-sm font-medium">
                      {fieldState.error.message}
                    </p>
                  )}
                </div>
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
                ? t("onboarding.creating")
                : t("onboarding.submit")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
