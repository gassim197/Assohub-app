import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import type { TransactionWithRecorderRow } from "@/lib/reports/queries";
import { isExpenseCategory } from "@/lib/reports/constants";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpenseRowActions } from "./expense-row-actions";

/**
 * Contenu de l'onglet "Dépenses" (checkpoint 1, session 7). Server Component :
 * la liste est déjà chargée par la page parente (`requireOrgAccess` +
 * `listExpenses`). Pas de pagination — volume attendu faible pour une
 * association (même décision que les autres listes de l'app).
 */
export async function ExpensesTab({
  orgSlug,
  expenses,
}: {
  orgSlug: string;
  expenses: TransactionWithRecorderRow[];
}) {
  const [t, tCategory, locale] = await Promise.all([
    getTranslations("reports.expenses"),
    getTranslations("reports.categories.expense"),
    getLocale(),
  ]);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          render={<Link href={`/${orgSlug}/reports?newExpense=true`} />}
        >
          <Plus />
          {t("new")}
        </Button>
      </div>

      {expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-6 rounded-full bg-destructive/10 p-4">
              <Receipt className="size-10 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">{t("empty.title")}</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {t("empty.description")}
            </p>
            <Button
              className="mt-6"
              render={<Link href={`/${orgSlug}/reports?newExpense=true`} />}
            >
              <Plus />
              {t("empty.cta")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.date")}</TableHead>
                <TableHead>{t("table.category")}</TableHead>
                <TableHead>{t("table.description")}</TableHead>
                <TableHead>{t("table.amount")}</TableHead>
                <TableHead>{t("table.recordedBy")}</TableHead>
                <TableHead className="w-12 text-right">
                  <span className="sr-only">{t("rowActions.label")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {dateFormatter.format(new Date(expense.occurredAt))}
                  </TableCell>
                  <TableCell>
                    {isExpenseCategory(expense.category)
                      ? tCategory(expense.category)
                      : expense.category}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    <span className="block">{expense.description}</span>
                    {expense.referenceDocument ? (
                      <span className="block text-xs text-muted-foreground">
                        {expense.referenceDocument}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="tabular-nums text-destructive">
                    {formatCurrency(expense.amount, locale)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {expense.recordedByName}
                  </TableCell>
                  <TableCell className="text-right">
                    <ExpenseRowActions orgSlug={orgSlug} expense={expense} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
