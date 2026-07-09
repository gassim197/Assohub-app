"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { softDeletePayment } from "@/lib/cotisations/payment-actions";
import { computeCotisationStatus } from "@/lib/cotisations/status";
import { STATUS_I18N_KEY, isCotisationStatus } from "@/lib/cotisations/constants";
import type { CotisationSummary, PaymentWithRecorderRow } from "@/lib/cotisations/payment-queries";
import { formatCurrency } from "@/lib/currency";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Confirmation d'annulation d'un paiement (soft delete, checkpoint 2, session
 * 5B) : annonce le statut prévu de la cotisation après suppression, calculé
 * avec `computeCotisationStatus` (réplique pure de la source de vérité SQL,
 * lib/cotisations/status.ts) — un président ne doit pas être surpris du
 * résultat avant de confirmer.
 */
export function DeletePaymentDialog({
  orgSlug,
  payment,
  cotisation,
  open,
  onOpenChange,
}: {
  orgSlug: string;
  payment: PaymentWithRecorderRow;
  cotisation: CotisationSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("cotisations.payments.deleteDialog");
  const tStatus = useTranslations("cotisations.status");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  const predictedPaidAmount = Math.max(0, cotisation.paidAmount - payment.amount);
  const predictedStatus = computeCotisationStatus({
    dueAmount: cotisation.dueAmount,
    paidAmount: predictedPaidAmount,
    dueDate: cotisation.dueDate,
  });
  const predictedStatusLabel = isCotisationStatus(predictedStatus)
    ? tStatus(STATUS_I18N_KEY[predictedStatus])
    : predictedStatus;

  function onConfirm() {
    startTransition(async () => {
      const result = await softDeletePayment(orgSlug, payment.id);

      if (result.ok) {
        toast.success(t("success"));
        onOpenChange(false);
        router.refresh();
        return;
      }

      toast.error(t("error"));
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("description", {
              amount: formatCurrency(payment.amount, locale),
              date: dateFormatter.format(new Date(payment.paidAt)),
              status: predictedStatusLabel,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? t("submitting") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
