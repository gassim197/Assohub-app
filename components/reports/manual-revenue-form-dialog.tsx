"use client";

import { useEffect, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { createManualRevenue, updateManualRevenue } from "@/lib/reports/actions";
import {
  buildManualRevenueSchema,
  type ManualRevenueFormValues,
} from "@/lib/reports/schema";
import {
  DEFAULT_MANUAL_REVENUE_CATEGORY,
  MANUAL_REVENUE_CATEGORIES,
  isRevenueCategory,
  type ManualRevenueCategory,
} from "@/lib/reports/constants";
import { todayISO } from "@/lib/reports/period";
import type { TransactionWithRecorderRow } from "@/lib/reports/queries";
import { centimesToGnf } from "@/lib/currency";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

/** Valeurs vierges (création) ou pré-remplies depuis un revenu existant (édition). */
function buildDefaults(
  revenue?: TransactionWithRecorderRow,
): ManualRevenueFormValues {
  if (!revenue) {
    return {
      amount: 0,
      category: DEFAULT_MANUAL_REVENUE_CATEGORY,
      description: "",
      occurredAt: todayISO(),
      referenceDocument: "",
    };
  }

  return {
    amount: centimesToGnf(revenue.amount),
    category:
      isRevenueCategory(revenue.category) && revenue.category !== "cotisations"
        ? revenue.category
        : DEFAULT_MANUAL_REVENUE_CATEGORY,
    description: revenue.description,
    occurredAt: revenue.occurredAt,
    referenceDocument: revenue.referenceDocument ?? "",
  };
}

/**
 * Modale de création (`?newRevenue=true`) ou d'édition
 * (`?editRevenue=true&transactionId=X`) d'un revenu manuel (dons,
 * subventions, etc.) — `cotisations` n'est jamais proposé, réservé à la
 * génération automatique depuis les paiements.
 */
export function ManualRevenueFormDialog({
  orgSlug,
  revenue,
}: {
  orgSlug: string;
  revenue?: TransactionWithRecorderRow;
}) {
  const t = useTranslations("reports.manualRevenues.form");
  const tCategory = useTranslations("reports.categories.revenue");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const isEdit = Boolean(revenue);
  const param = isEdit ? "editRevenue" : "newRevenue";
  const open = searchParams.get(param) === "true";

  const schema = useMemo(
    () =>
      buildManualRevenueSchema({
        amountInteger: t("errors.amountInteger"),
        amountMin: t("errors.amountMin"),
        amountMax: t("errors.amountMax"),
        descriptionRequired: t("errors.descriptionRequired"),
        dateInvalid: t("errors.dateInvalid"),
        dateNotFuture: t("errors.dateNotFuture"),
      }),
    [t],
  );

  const form = useForm<ManualRevenueFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: buildDefaults(revenue),
  });

  useEffect(() => {
    if (open) form.reset(buildDefaults(revenue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function closeDialog() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(param);
    if (isEdit) params.delete("transactionId");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function onSubmit(values: ManualRevenueFormValues) {
    startTransition(async () => {
      const result =
        revenue !== undefined
          ? await updateManualRevenue(orgSlug, revenue.id, values)
          : await createManualRevenue(orgSlug, values);

      if (result.ok) {
        toast.success(isEdit ? t("editSuccess") : t("success"));
        closeDialog();
        router.refresh();
        return;
      }

      toast.error(
        result.error === "linkedToPayment"
          ? t("errorLinkedToPayment")
          : t("errorGeneric"),
      );
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
          <DialogTitle>{isEdit ? t("editTitle") : t("title")}</DialogTitle>
          <DialogDescription>
            {isEdit ? t("editDescription") : t("description")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fieldAmount")}</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} step="1" inputMode="numeric" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fieldCategory")}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) =>
                      field.onChange(value as ManualRevenueCategory)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MANUAL_REVENUE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {tCategory(category)}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fieldDescription")}</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="occurredAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fieldDate")}</FormLabel>
                  <FormControl>
                    <Input type="date" max={todayISO()} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="referenceDocument"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("fieldReference")}{" "}
                    <span className="text-muted-foreground">{t("optional")}</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
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
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEdit
                    ? t("editSubmitting")
                    : t("submitting")
                  : isEdit
                    ? t("editSubmit")
                    : t("submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
