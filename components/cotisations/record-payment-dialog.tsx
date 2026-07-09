"use client";

import { useEffect, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";

import { recordPayment, updatePayment } from "@/lib/cotisations/payment-actions";
import { buildPaymentSchema } from "@/lib/cotisations/payment-schema";
import {
  DEFAULT_PAYMENT_METHOD,
  PAYMENT_METHODS,
  isPaymentMethod,
  requiresPaymentReference,
  type PaymentMethod,
} from "@/lib/cotisations/payment-constants";
import { isCotisationFrequency } from "@/lib/cotisations/constants";
import { formatPeriodLabel, todayISO } from "@/lib/cotisations/period";
import type { CotisationSummary, PaymentRow } from "@/lib/cotisations/payment-queries";
import { centimesToGnf, formatCurrency, gnfToCentimes } from "@/lib/currency";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

interface PaymentFormValues {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  paidAt: string;
  note: string;
}

/** Valeurs vierges (création, défaut = restant) ou pré-remplies (édition). */
function buildDefaults(
  remainingGnf: number,
  payment?: PaymentRow,
): PaymentFormValues {
  if (!payment) {
    return {
      amount: remainingGnf,
      paymentMethod: DEFAULT_PAYMENT_METHOD,
      paymentReference: "",
      paidAt: todayISO(),
      note: "",
    };
  }

  return {
    amount: centimesToGnf(payment.amount),
    paymentMethod: isPaymentMethod(payment.paymentMethod)
      ? payment.paymentMethod
      : DEFAULT_PAYMENT_METHOD,
    paymentReference: payment.paymentReference ?? "",
    paidAt: payment.paidAt,
    note: payment.note ?? "",
  };
}

/**
 * Modal d'encaissement (session 5B, checkpoint 1) et de correction d'un
 * paiement existant (checkpoint 2).
 *
 * En création : pilotée par `?recordPayment=true&cotisationId=X`, montée par
 * la page uniquement quand le résumé de la cotisation a pu être résolu côté
 * serveur (multi-tenant, cf. `getCotisationSummary`). En édition (`payment`
 * fourni) : `?editPayment=true&paymentId=X`, même patron que
 * `MemberFormDialog`/`CotisationTypeFormDialog`.
 *
 * Le plafond du montant exclut le paiement en cours d'édition de son propre
 * calcul de "restant" — sinon corriger un paiement de 5 000 GNF sur une
 * cotisation déjà entièrement couverte serait bloqué par son propre montant.
 */
export function RecordPaymentDialog({
  orgSlug,
  cotisation,
  payment,
}: {
  orgSlug: string;
  cotisation: CotisationSummary;
  payment?: PaymentRow;
}) {
  const t = useTranslations("cotisations.payments");
  const tMethod = useTranslations("cotisations.paymentMethod");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const isEdit = Boolean(payment);
  const param = isEdit ? "editPayment" : "recordPayment";
  const open = searchParams.get(param) === "true";

  const excludedAmount = payment?.amount ?? 0;
  const remainingCentimes = Math.max(
    0,
    cotisation.dueAmount - cotisation.paidAmount + excludedAmount,
  );
  const remainingGnf = centimesToGnf(remainingCentimes);

  const schema = useMemo(
    () =>
      buildPaymentSchema(
        {
          amountInteger: t("form.errors.amountInteger"),
          amountMin: t("form.errors.amountMin"),
          amountMax: t("form.errors.amountMax"),
          referenceRequired: t("form.errors.referenceRequired"),
          dateInvalid: t("form.errors.dateInvalid"),
          dateNotFuture: t("form.errors.dateNotFuture"),
          noteMax: t("form.errors.noteMax"),
        },
        { maxAmountGnf: remainingGnf },
      ),
    [t, remainingGnf],
  );

  const form = useForm<PaymentFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: buildDefaults(remainingGnf, payment),
  });

  const paymentMethod = useWatch({ control: form.control, name: "paymentMethod" });

  useEffect(() => {
    if (open) form.reset(buildDefaults(remainingGnf, payment));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function closeDialog() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(param);
    params.delete("cotisationId");
    params.delete("paymentId");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function onSubmit(values: PaymentFormValues) {
    startTransition(async () => {
      const result =
        isEdit && payment
          ? await updatePayment(orgSlug, payment.id, values)
          : await recordPayment(orgSlug, cotisation.id, values);

      if (result.ok) {
        toast.success(
          isEdit
            ? t("editDialog.success")
            : t("form.success", {
                amount: formatCurrency(gnfToCentimes(values.amount), locale),
                member: cotisation.memberFullName,
              }),
        );
        closeDialog();
        router.refresh();
        return;
      }

      if (result.error === "exceedsRemaining") {
        form.setError("amount", {
          message: t("form.errors.exceedsRemaining", {
            remaining: formatCurrency(gnfToCentimes(result.remaining ?? 0), locale),
          }),
        });
      } else {
        toast.error(t("form.errors.generic"));
      }
    });
  }

  const frequency = isCotisationFrequency(cotisation.frequency)
    ? cotisation.frequency
    : "monthly";
  const periodLabel = formatPeriodLabel(cotisation.periodStart, frequency, locale);

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
            {isEdit
              ? t("editDialog.title")
              : t("dialog.title", {
                  member: cotisation.memberFullName,
                  type: cotisation.typeName,
                  period: periodLabel,
                })}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("editDialog.description") : t("dialog.description")}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-3 gap-2 rounded-md border border-foreground/10 bg-muted/30 p-3 text-sm">
          <div>
            <dt className="text-muted-foreground">{t("dialog.dueAmount")}</dt>
            <dd className="font-medium tabular-nums">
              {formatCurrency(cotisation.dueAmount, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("dialog.paidAmount")}</dt>
            <dd className="font-medium tabular-nums">
              {formatCurrency(cotisation.paidAmount, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("dialog.remaining")}</dt>
            <dd className="font-medium tabular-nums text-primary">
              {formatCurrency(remainingCentimes, locale)}
            </dd>
          </div>
        </dl>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.amount")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={remainingGnf}
                      step="1"
                      inputMode="numeric"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.paymentMethod")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {tMethod(method)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {requiresPaymentReference(paymentMethod) ? (
              <FormField
                control={form.control}
                name="paymentReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t(`form.referenceLabel.${paymentMethod}`)}
                    </FormLabel>
                    <FormControl>
                      <Input autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="paidAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.paidAt")}</FormLabel>
                  <FormControl>
                    <Input type="date" max={todayISO()} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.note")}{" "}
                    <span className="text-muted-foreground">
                      {t("form.optional")}
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
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
                {t("form.cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEdit
                    ? t("editDialog.submitting")
                    : t("form.submitting")
                  : isEdit
                    ? t("editDialog.submit")
                    : t("form.submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
