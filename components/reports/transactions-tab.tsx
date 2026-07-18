import Link from "next/link";
import { ArrowUpRight, Receipt } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import type { ListTransactionsResult } from "@/lib/reports/queries";
import {
  TRANSACTION_TYPE_BADGE_VARIANT,
  isExpenseCategory,
  isRevenueCategory,
} from "@/lib/reports/constants";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransactionsToolbar } from "./transactions-toolbar";
import { TransactionsPagination } from "./transactions-pagination";

/**
 * Contenu de l'onglet "Transactions" (checkpoint 3, session 7) : liste
 * complète des revenus et dépenses, filtrable et paginée (20/page). Server
 * Component : la page parente résout les filtres depuis l'URL et charge la
 * page courante via `listTransactions`. Les lignes issues d'un paiement de
 * cotisation (`paymentId` non nul) ne sont pas éditables ici — un lien
 * "Voir le paiement" renvoie vers la cotisation liée dans le module
 * Cotisations ; les transactions manuelles restent éditables depuis leur
 * onglet dédié (Dépenses / Autres revenus).
 */
export async function TransactionsTab({
  orgSlug,
  result,
}: {
  orgSlug: string;
  result: ListTransactionsResult;
}) {
  const [t, tTypes, tCategoryRevenue, tCategoryExpense, locale] = await Promise.all([
    getTranslations("reports.transactions"),
    getTranslations("reports.transactions.types"),
    getTranslations("reports.categories.revenue"),
    getTranslations("reports.categories.expense"),
    getLocale(),
  ]);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  function categoryLabel(category: string) {
    if (isRevenueCategory(category)) return tCategoryRevenue(category);
    if (isExpenseCategory(category)) return tCategoryExpense(category);
    return category;
  }

  return (
    <div className="space-y-4">
      <TransactionsToolbar />

      {result.rows.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-6 rounded-full bg-muted p-4">
            <Receipt className="size-10 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </Card>
      ) : (
        <>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.date")}</TableHead>
                  <TableHead>{t("table.type")}</TableHead>
                  <TableHead>{t("table.category")}</TableHead>
                  <TableHead>{t("table.description")}</TableHead>
                  <TableHead>{t("table.amount")}</TableHead>
                  <TableHead>{t("table.recordedBy")}</TableHead>
                  <TableHead className="w-12 text-right">
                    <span className="sr-only">{t("table.viewPayment")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((row) => {
                  const isRevenue = row.type === "revenue";
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {dateFormatter.format(new Date(row.occurredAt))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={TRANSACTION_TYPE_BADGE_VARIANT[row.type as "revenue" | "expense"]}>
                          {tTypes(row.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{categoryLabel(row.category)}</TableCell>
                      <TableCell className="font-medium text-foreground">
                        <span className="block">{row.description}</span>
                        {row.referenceDocument ? (
                          <span className="block text-xs text-muted-foreground">
                            {row.referenceDocument}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell
                        className={`tabular-nums ${isRevenue ? "text-success" : "text-destructive"}`}
                      >
                        {formatCurrency(row.amount, locale)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.recordedByName}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.cotisationId ? (
                          <Link
                            href={`/${orgSlug}/cotisations/${row.cotisationId}`}
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            {t("table.viewPayment")}
                            <ArrowUpRight className="size-3.5" />
                          </Link>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <TransactionsPagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            pageSize={result.pageSize}
          />
        </>
      )}
    </div>
  );
}
