import { getLocale, getTranslations } from "next-intl/server";

import type { CotisationSummary, PaymentWithRecorderRow } from "@/lib/cotisations/payment-queries";
import { isPaymentMethod } from "@/lib/cotisations/payment-constants";
import { formatCurrency } from "@/lib/currency";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentRowActions } from "./payment-row-actions";

/**
 * Table de l'historique des paiements d'une cotisation (checkpoint 2, session
 * 5B). Server Component : la liste est déjà chargée par la page parente
 * (`listPaymentsForCotisation`).
 */
export async function PaymentHistoryTable({
  orgSlug,
  cotisation,
  payments,
}: {
  orgSlug: string;
  cotisation: CotisationSummary;
  payments: PaymentWithRecorderRow[];
}) {
  const [t, tMethod, locale] = await Promise.all([
    getTranslations("cotisations.payments"),
    getTranslations("cotisations.paymentMethod"),
    getLocale(),
  ]);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  if (payments.length === 0) {
    return (
      <Card className="px-6 py-16 text-center text-sm text-muted-foreground">
        {t("history.empty")}
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("history.table.date")}</TableHead>
            <TableHead>{t("history.table.amount")}</TableHead>
            <TableHead>{t("history.table.method")}</TableHead>
            <TableHead>{t("history.table.reference")}</TableHead>
            <TableHead>{t("history.table.recordedBy")}</TableHead>
            <TableHead>{t("history.table.note")}</TableHead>
            <TableHead className="w-12 text-right">
              <span className="sr-only">{t("rowActions.label")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="text-muted-foreground tabular-nums">
                {dateFormatter.format(new Date(payment.paidAt))}
              </TableCell>
              <TableCell className="font-medium tabular-nums text-foreground">
                {formatCurrency(payment.amount, locale)}
              </TableCell>
              <TableCell>
                {isPaymentMethod(payment.paymentMethod)
                  ? tMethod(payment.paymentMethod)
                  : payment.paymentMethod}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {payment.paymentReference ?? "—"}
              </TableCell>
              <TableCell>{payment.recordedByName}</TableCell>
              <TableCell className="max-w-48 truncate text-muted-foreground">
                {payment.note ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                <PaymentRowActions
                  orgSlug={orgSlug}
                  payment={payment}
                  cotisation={cotisation}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
