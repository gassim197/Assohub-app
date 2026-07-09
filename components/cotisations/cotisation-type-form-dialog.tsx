"use client";

import { useEffect, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import {
  createCotisationType,
  updateCotisationType,
} from "@/lib/cotisations/types-actions";
import { buildCotisationTypeSchema } from "@/lib/cotisations/schema";
import {
  COTISATION_FREQUENCIES,
  DEFAULT_COTISATION_FREQUENCY,
  type CotisationFrequency,
} from "@/lib/cotisations/constants";
import { centimesToGnf } from "@/lib/currency";
import type { CotisationTypeRow } from "@/lib/cotisations/queries";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

interface CotisationTypeFormValues {
  name: string;
  description: string;
  defaultAmount: number;
  frequency: CotisationFrequency;
  autoGenerate: boolean;
  isActive: boolean;
}

/** Valeurs vierges (création) ou pré-remplies depuis un type (édition). */
function buildDefaults(type?: CotisationTypeRow): CotisationTypeFormValues {
  if (!type) {
    return {
      name: "",
      description: "",
      defaultAmount: 0,
      frequency: DEFAULT_COTISATION_FREQUENCY,
      autoGenerate: true,
      isActive: true,
    };
  }

  return {
    name: type.name,
    description: type.description ?? "",
    defaultAmount: centimesToGnf(type.defaultAmount),
    frequency: type.frequency as CotisationFrequency,
    autoGenerate: type.autoGenerate,
    isActive: type.isActive,
  };
}

/**
 * Modal de création/édition d'un type de cotisation (checkpoint 1, session 5A).
 *
 * Pilotée par l'URL, même patron que `MemberFormDialog` : `?newType=true` en
 * création, `?editType=true&typeId=X` en édition.
 */
export function CotisationTypeFormDialog({
  orgSlug,
  type,
}: {
  orgSlug: string;
  type?: CotisationTypeRow;
}) {
  const t = useTranslations("cotisations");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const isEdit = Boolean(type);
  const param = isEdit ? "editType" : "newType";
  const open = searchParams.get(param) === "true";

  const schema = useMemo(
    () =>
      buildCotisationTypeSchema({
        nameMin: t("types.form.errors.nameMin"),
        amountPositive: t("types.form.errors.amountPositive"),
      }),
    [t],
  );

  const form = useForm<CotisationTypeFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: buildDefaults(type),
  });

  useEffect(() => {
    if (open) form.reset(buildDefaults(type));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function closeDialog() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(param);
    if (isEdit) params.delete("typeId");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function onSubmit(values: CotisationTypeFormValues) {
    startTransition(async () => {
      const result =
        type !== undefined
          ? await updateCotisationType(orgSlug, type.id, values)
          : await createCotisationType(orgSlug, values);

      if (result.ok) {
        toast.success(
          isEdit ? t("types.editForm.success") : t("types.form.success"),
        );
        closeDialog();
        router.refresh();
        return;
      }

      toast.error(t("types.form.errors.generic"));
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
          <DialogTitle>
            {isEdit ? t("types.editForm.title") : t("types.form.title")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("types.editForm.dialogDescription")
              : t("types.form.dialogDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("types.form.name")}</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("types.form.descriptionLabel")}{" "}
                    <span className="text-muted-foreground">
                      {t("types.form.optional")}
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="defaultAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("types.form.defaultAmount")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      inputMode="numeric"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {t("types.form.defaultAmountHint")}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("types.form.frequency")}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid-cols-2"
                    >
                      {COTISATION_FREQUENCIES.map((freq) => (
                        <Label
                          key={freq}
                          className="flex items-center gap-2 rounded-md border border-input p-2.5 text-sm font-normal has-[[data-checked]]:border-primary"
                        >
                          <RadioGroupItem value={freq} />
                          {t(`types.frequency.${freq}`)}
                        </Label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="autoGenerate"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border border-input p-3">
                  <div className="space-y-0.5">
                    <FormLabel>{t("types.form.autoGenerate")}</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      {t("types.form.autoGenerateHint")}
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border border-input p-3">
                  <div className="space-y-0.5">
                    <FormLabel>{t("types.form.isActive")}</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      {t("types.form.isActiveHint")}
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={isPending}
              >
                {t("types.form.cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEdit
                    ? t("types.editForm.submitting")
                    : t("types.form.submitting")
                  : isEdit
                    ? t("types.editForm.submit")
                    : t("types.form.submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
