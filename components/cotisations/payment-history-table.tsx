import { getLocale, getTranslations } from "next-intl/server";

import type { CotisationSummary, PaymentWithRecorderRow } from "@/lib/cotisations/payment-queries";
import { isPaymentMethod } from "@/lib/cotisations/payment-constants";
import { formatCurrency } from "@/lib/currency";
import type { AttachedDocumentRow } from "@/lib/documents/queries";
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
import { PaymentAttachmentCell } from "./payment-attachment-cell";

/**
 * Table de l'historique des paiements d'une cotisation (checkpoint 2, session
 * 5B ; colonne Justificatif ajoutée au chantier Documents). Server Component :
 * la liste est déjà chargée par la page parente (`listPaymentsForCotisation`).
 *
 * Pas de page de détail dédiée à un paiement individuel (un paiement est une
 * ligne de l'historique d'une cotisation) : le rattachement d'un justificatif
 * vit donc par ligne (`PaymentAttachmentCell`) plutôt que sur une page qui
 * n'existe pas — décision validée avec le fondateur.
 */
export async function PaymentHistoryTable({
  orgSlug,
  cotisation,
  payments,
  attachedDocuments,
  unattachedDocuments,
  canManageDocuments,
}: {
  orgSlug: string;
  cotisation: CotisationSummary;
  payments: PaymentWithRecorderRow[];
  attachedDocuments: AttachedDocumentRow[];
  unattachedDocuments: AttachedDocumentRow[];
  canManageDocuments: boolean;
}) {
  const [t, tMethod, locale] = await Promise.all([
    getTranslations("cotisations.payments"),
    getTranslations("cotisations.paymentMethod"),
    getLocale(),
  ]);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  // Un paiement n'a en pratique qu'un seul justificatif ; en cas de doublon on
  // n'en affiche qu'un (le plus récent, `attachedDocuments` est déjà trié par
  // `createdAt DESC`).
  const documentByPaymentId = new Map<string, AttachedDocumentRow>();
  for (const document of attachedDocuments) {
    if (document.paymentId && !documentByPaymentId.has(document.paymentId)) {
      documentByPaymentId.set(document.paymentId, document);
    }
  }

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
            <TableHead>{t("attachment.columnLabel")}</TableHead>
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
              <TableCell>
                <PaymentAttachmentCell
                  orgSlug={orgSlug}
                  paymentId={payment.id}
                  document={documentByPaymentId.get(payment.id)}
                  canManage={canManageDocuments}
                  existingDocuments={unattachedDocuments}
                />
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
