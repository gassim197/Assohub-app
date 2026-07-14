"use client";

import { useEffect, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { createExpense, updateExpense } from "@/lib/reports/actions";
import { buildExpenseSchema, type ExpenseFormValues } from "@/lib/reports/schema";
import {
  DEFAULT_EXPENSE_CATEGORY,
  EXPENSE_CATEGORIES,
  isExpenseCategory,
  type ExpenseCategory,
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

/** Valeurs vierges (création) ou pré-remplies depuis une dépense existante (édition). */
function buildDefaults(expense?: TransactionWithRecorderRow): ExpenseFormValues {
  if (!expense) {
    return {
      amount: 0,
      category: DEFAULT_EXPENSE_CATEGORY,
      description: "",
      occurredAt: todayISO(),
      referenceDocument: "",
    };
  }

  return {
    amount: centimesToGnf(expense.amount),
    category: isExpenseCategory(expense.category)
      ? expense.category
      : DEFAULT_EXPENSE_CATEGORY,
    description: expense.description,
    occurredAt: expense.occurredAt,
    referenceDocument: expense.referenceDocument ?? "",
  };
}

/**
 * Modale de création (`?newExpense=true`) ou d'édition
 * (`?editExpense=true&transactionId=X`) d'une dépense — même patron
 * d'URL-driven dialog que `MeetingFormDialog`/`RecordPaymentDialog`.
 */
export function ExpenseFormDialog({
  orgSlug,
  expense,
}: {
  orgSlug: string;
  expense?: TransactionWithRecorderRow;
}) {
  const t = useTranslations("reports.expenses.form");
  const tCategory = useTranslations("reports.categories.expense");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const isEdit = Boolean(expense);
  const param = isEdit ? "editExpense" : "newExpense";
  const open = searchParams.get(param) === "true";

  const schema = useMemo(
    () =>
      buildExpenseSchema({
        amountInteger: t("errors.amountInteger"),
        amountMin: t("errors.amountMin"),
        amountMax: t("errors.amountMax"),
        descriptionRequired: t("errors.descriptionRequired"),
        dateInvalid: t("errors.dateInvalid"),
        dateNotFuture: t("errors.dateNotFuture"),
      }),
    [t],
  );

  const form = useForm<ExpenseFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: buildDefaults(expense),
  });

  useEffect(() => {
    if (open) form.reset(buildDefaults(expense));
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

  function onSubmit(values: ExpenseFormValues) {
    startTransition(async () => {
      const result =
        expense !== undefined
          ? await updateExpense(orgSlug, expense.id, values)
          : await createExpense(orgSlug, values);

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
                    onValueChange={(value) => field.onChange(value as ExpenseCategory)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((category) => (
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
