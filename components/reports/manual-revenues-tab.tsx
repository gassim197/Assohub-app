import Link from "next/link";
import { Gift, Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import type { TransactionWithRecorderRow } from "@/lib/reports/queries";
import { isRevenueCategory } from "@/lib/reports/constants";
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
import { ManualRevenueRowActions } from "./manual-revenue-row-actions";

/**
 * Contenu de l'onglet "Autres revenus" (checkpoint 1, session 7). Server
 * Component : la liste est déjà chargée par la page parente
 * (`requireOrgAccess` + `listManualRevenues`, qui exclut déjà les revenus de
 * cotisations). Pas de pagination — volume attendu faible.
 */
export async function ManualRevenuesTab({
  orgSlug,
  revenues,
}: {
  orgSlug: string;
  revenues: TransactionWithRecorderRow[];
}) {
  const [t, tCategory, locale] = await Promise.all([
    getTranslations("reports.manualRevenues"),
    getTranslations("reports.categories.revenue"),
    getLocale(),
  ]);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          render={<Link href={`/${orgSlug}/reports?newRevenue=true`} />}
        >
          <Plus />
          {t("new")}
        </Button>
      </div>

      {revenues.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-6 rounded-full bg-success/10 p-4">
              <Gift className="size-10 text-success" />
            </div>
            <h2 className="text-lg font-semibold">{t("empty.title")}</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {t("empty.description")}
            </p>
            <Button
              className="mt-6"
              render={<Link href={`/${orgSlug}/reports?newRevenue=true`} />}
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
              {revenues.map((revenue) => (
                <TableRow key={revenue.id}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {dateFormatter.format(new Date(revenue.occurredAt))}
                  </TableCell>
                  <TableCell>
                    {isRevenueCategory(revenue.category)
                      ? tCategory(revenue.category)
                      : revenue.category}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    <span className="block">{revenue.description}</span>
                    {revenue.referenceDocument ? (
                      <span className="block text-xs text-muted-foreground">
                        {revenue.referenceDocument}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="tabular-nums text-success">
                    {formatCurrency(revenue.amount, locale)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {revenue.recordedByName}
                  </TableCell>
                  <TableCell className="text-right">
                    <ManualRevenueRowActions orgSlug={orgSlug} revenue={revenue} />
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
