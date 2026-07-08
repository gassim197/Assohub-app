"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CalendarIcon } from "lucide-react";

import { generateOrganizationInviteLink } from "@/lib/invitations/actions";
import { buildGenerateInviteLinkSchema } from "@/lib/invitations/schema";
import {
  INVITATION_ROLES,
  INVITE_LINK_ACCEPTANCE_MODES,
  INVITE_LINK_EXPIRY_OPTIONS,
  INVITE_LINK_MAX_USES_OPTIONS,
  type InviteLinkAcceptanceMode,
  type InviteLinkExpiryOption,
  type InviteLinkMaxUsesOption,
} from "@/lib/invitations/constants";
import type { InvitationRole } from "@/lib/invitations/constants";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface GenerateInviteLinkFormValues {
  defaultRole: InvitationRole;
  acceptanceMode: InviteLinkAcceptanceMode;
  expiryOption: InviteLinkExpiryOption;
  customExpiresAt: string;
  maxUsesOption: InviteLinkMaxUsesOption;
  maxUsesValue: number | undefined;
}

function buildDefaults(): GenerateInviteLinkFormValues {
  return {
    defaultRole: "membre",
    acceptanceMode: "auto",
    expiryOption: "30d",
    customExpiresAt: "",
    maxUsesOption: "unlimited",
    maxUsesValue: undefined,
  };
}

/**
 * Formulaire de génération du lien d'invitation partageable (volet 3 de la
 * 4B, checkpoint 1). Piloté par l'URL (`?generateLink=true`), même convention
 * que `InviteMemberDialog`. Réutilisé à la fois pour le premier lien (état
 * vide) et pour "Générer un nouveau lien" (après confirmation côté
 * `InviteLinkCard`, qui prévient que cela révoque le lien actuel).
 */
export function GenerateInviteLinkDialog({ orgSlug }: { orgSlug: string }) {
  const t = useTranslations("invitations.inviteLink.dialog");
  const tRoles = useTranslations("members");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const open = searchParams.get("generateLink") === "true";

  const schema = useMemo(
    () =>
      buildGenerateInviteLinkSchema({
        customExpiresAtRequired: t("errors.customExpiresAtRequired"),
        maxUsesValueRequired: t("errors.maxUsesValueRequired"),
      }),
    [t],
  );

  const form = useForm<GenerateInviteLinkFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: buildDefaults(),
  });

  const expiryOption = useWatch({ control: form.control, name: "expiryOption" });
  const maxUsesOption = useWatch({ control: form.control, name: "maxUsesOption" });
  const customExpiresAt = useWatch({ control: form.control, name: "customExpiresAt" });

  function closeDialog() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("generateLink");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function onSubmit(values: GenerateInviteLinkFormValues) {
    startTransition(async () => {
      const result = await generateOrganizationInviteLink(orgSlug, values);

      if (result.ok) {
        toast.success(t("success"));
        form.reset(buildDefaults());
        closeDialog();
        router.refresh();
        return;
      }

      toast.error(t("errors.generic"));
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeDialog();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="defaultRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("role")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INVITATION_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {tRoles(`roles.${role}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="acceptanceMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("acceptanceMode")}</FormLabel>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    {INVITE_LINK_ACCEPTANCE_MODES.map((mode) => (
                      <Label
                        key={mode}
                        className="flex items-start gap-2 rounded-md border border-input p-3 font-normal has-data-checked:border-primary"
                      >
                        <RadioGroupItem value={mode} className="mt-0.5" />
                        <span className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-foreground">
                            {t(`acceptanceModeOptions.${mode}`)}
                            {mode === "auto" ? (
                              <span className="ml-1 text-xs font-normal text-muted-foreground">
                                {t("recommended")}
                              </span>
                            ) : null}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t(`acceptanceModeOptions.${mode}Description`)}
                          </span>
                        </span>
                      </Label>
                    ))}
                  </RadioGroup>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiryOption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("expiry")}</FormLabel>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="grid-cols-2"
                  >
                    {INVITE_LINK_EXPIRY_OPTIONS.map((option) => (
                      <Label
                        key={option}
                        className="flex items-center gap-2 rounded-md border border-input p-2.5 font-normal has-data-checked:border-primary"
                      >
                        <RadioGroupItem value={option} />
                        <span className="text-sm">
                          {t(`expiryOptions.${option}`)}
                        </span>
                      </Label>
                    ))}
                  </RadioGroup>
                  <FormMessage />
                </FormItem>
              )}
            />

            {expiryOption === "custom" ? (
              <FormField
                control={form.control}
                name="customExpiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("customExpiresAtLabel")}</FormLabel>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start font-normal"
                          />
                        }
                      >
                        <CalendarIcon className="size-4" />
                        {customExpiresAt
                          ? new Date(customExpiresAt).toLocaleDateString()
                          : t("customExpiresAtPlaceholder")}
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={
                            customExpiresAt ? new Date(customExpiresAt) : undefined
                          }
                          onSelect={(date) => {
                            field.onChange(date ? date.toISOString() : "");
                            setDatePickerOpen(false);
                          }}
                          disabled={{ before: new Date() }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="maxUsesOption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("maxUses")}</FormLabel>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="grid-cols-2"
                  >
                    {INVITE_LINK_MAX_USES_OPTIONS.map((option) => (
                      <Label
                        key={option}
                        className="flex items-center gap-2 rounded-md border border-input p-2.5 font-normal has-data-checked:border-primary"
                      >
                        <RadioGroupItem value={option} />
                        <span className="text-sm">
                          {t(`maxUsesOptions.${option}`)}
                        </span>
                      </Label>
                    ))}
                  </RadioGroup>
                  <FormMessage />
                </FormItem>
              )}
            />

            {maxUsesOption === "limited" ? (
              <FormField
                control={form.control}
                name="maxUsesValue"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder={t("maxUsesValuePlaceholder")}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? undefined : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={isPending}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t("submitting") : t("submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
