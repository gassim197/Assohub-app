"use client";

import { useLocale, useTranslations } from "next-intl";

import { requiresPaymentReference, isPaymentMethod } from "@/lib/cotisations/payment-constants";
import type { PaymentWithRecorderRow } from "@/lib/cotisations/payment-queries";
import { formatCurrency } from "@/lib/currency";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Vue readonly d'un paiement (checkpoint 2, session 5B) — contrôlée par le
 * parent (`PaymentRowActions`), pas par l'URL : contenu éphémère, pas destiné
 * à être partagé par lien (même patron que les dialogs de confirmation 5A).
 */
export function PaymentDetailDialog({
  payment,
  open,
  onOpenChange,
}: {
  payment: PaymentWithRecorderRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("cotisations.payments");
  const tMethod = useTranslations("cotisations.paymentMethod");
  const locale = useLocale();
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  const method = isPaymentMethod(payment.paymentMethod) ? payment.paymentMethod : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("detailDialog.title")}</DialogTitle>
          <DialogDescription>{t("detailDialog.description")}</DialogDescription>
        </DialogHeader>

        <dl className="space-y-3 text-sm">
          <div className="grid grid-cols-[160px_1fr] gap-2">
            <dt className="text-muted-foreground">{t("detailDialog.amount")}</dt>
            <dd className="font-medium tabular-nums">
              {formatCurrency(payment.amount, locale)}
            </dd>
          </div>
          <div className="grid grid-cols-[160px_1fr] gap-2">
            <dt className="text-muted-foreground">{t("form.paidAt")}</dt>
            <dd>{dateFormatter.format(new Date(payment.paidAt))}</dd>
          </div>
          <div className="grid grid-cols-[160px_1fr] gap-2">
            <dt className="text-muted-foreground">{t("form.paymentMethod")}</dt>
            <dd>{method ? tMethod(method) : payment.paymentMethod}</dd>
          </div>
          {method && requiresPaymentReference(method) ? (
            <div className="grid grid-cols-[160px_1fr] gap-2">
              <dt className="text-muted-foreground">{t(`form.referenceLabel.${method}`)}</dt>
              <dd>{payment.paymentReference ?? "—"}</dd>
            </div>
          ) : null}
          <div className="grid grid-cols-[160px_1fr] gap-2">
            <dt className="text-muted-foreground">{t("detailDialog.recordedBy")}</dt>
            <dd>{payment.recordedByName}</dd>
          </div>
          <div className="grid grid-cols-[160px_1fr] gap-2">
            <dt className="text-muted-foreground">{t("form.note")}</dt>
            <dd className="text-muted-foreground">{payment.note ?? "—"}</dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
