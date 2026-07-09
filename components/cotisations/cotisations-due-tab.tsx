import { Clock } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import type {
  CotisationTypeRow,
  CotisationWithRelationsRow,
  ListCotisationsDueResult,
} from "@/lib/cotisations/queries";
import {
  STATUS_BADGE_VARIANT,
  STATUS_I18N_KEY,
  isCotisationFrequency,
  isCotisationStatus,
} from "@/lib/cotisations/constants";
import { isOverduePartial } from "@/lib/cotisations/status";
import { formatPeriodLabel } from "@/lib/cotisations/period";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CotisationsDueToolbar } from "./cotisations-due-toolbar";
import { CotisationsDueRowActions } from "./cotisations-due-row-actions";
import { CotisationsPagination } from "./cotisations-pagination";

function statusBadge(
  row: CotisationWithRelationsRow,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  const cotisationStatus = isCotisationStatus(row.status) ? row.status : null;
  const overdue = isOverduePartial({ status: row.status, dueDate: row.dueDate });
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant={cotisationStatus ? STATUS_BADGE_VARIANT[cotisationStatus] : "outline"}>
        {cotisationStatus ? t(`status.${STATUS_I18N_KEY[cotisationStatus]}`) : row.status}
      </Badge>
      {overdue ? (
        <span title={t("overduePartialHint")}>
          <Clock className="size-4 text-warning" aria-hidden="true" />
          <span className="sr-only">{t("overduePartialHint")}</span>
        </span>
      ) : null}
    </div>
  );
}

/** Montant : simple pour la plupart des statuts, "payé / dû" + barre pour `partiel`. */
function amountCell(row: CotisationWithRelationsRow, locale: string) {
  if (row.status !== "partiel" || row.dueAmount <= 0) {
    return (
      <span className="tabular-nums">{formatCurrency(row.dueAmount, locale)}</span>
    );
  }

  const percent = Math.min(100, Math.round((row.paidAmount / row.dueAmount) * 100));
  return (
    <div className="min-w-36 space-y-1">
      <span className="text-sm tabular-nums">
        {formatCurrency(row.paidAmount, locale)} / {formatCurrency(row.dueAmount, locale)}
      </span>
      <Progress value={percent} className="h-1" />
    </div>
  );
}

/**
 * Onglet "Cotisations dues" (checkpoint 3 5A, étendu checkpoint 1 5B) :
 * en_attente + partiel + en_retard par défaut (paye via `showPaid`),
 * filtrables, paginées 20/page. Server Component : la liste est déjà chargée
 * par la page parente selon les filtres résolus depuis l'URL.
 */
export async function CotisationsDueTab({
  orgSlug,
  types,
  result,
}: {
  orgSlug: string;
  types: CotisationTypeRow[];
  result: ListCotisationsDueResult;
}) {
  const [t, locale] = await Promise.all([
    getTranslations("cotisations"),
    getLocale(),
  ]);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="space-y-4">
      <CotisationsDueToolbar types={types} />

      {result.rows.length === 0 ? (
        <Card className="px-6 py-16 text-center text-sm text-muted-foreground">
          {t("due.noResults")}
        </Card>
      ) : (
        <>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("due.table.member")}</TableHead>
                  <TableHead>{t("due.table.type")}</TableHead>
                  <TableHead>{t("due.table.period")}</TableHead>
                  <TableHead>{t("due.table.dueAmount")}</TableHead>
                  <TableHead>{t("due.table.status")}</TableHead>
                  <TableHead>{t("due.table.dueDate")}</TableHead>
                  <TableHead className="w-12 text-right">
                    <span className="sr-only">{t("due.rowActions.label")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((row) => {
                  const frequency = isCotisationFrequency(row.frequency)
                    ? row.frequency
                    : "monthly";
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-foreground">
                        {row.memberFullName}
                      </TableCell>
                      <TableCell>{row.typeName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatPeriodLabel(row.periodStart, frequency, locale)}
                      </TableCell>
                      <TableCell>{amountCell(row, locale)}</TableCell>
                      <TableCell>{statusBadge(row, t)}</TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {dateFormatter.format(new Date(row.dueDate))}
                      </TableCell>
                      <TableCell className="text-right">
                        <CotisationsDueRowActions
                          orgSlug={orgSlug}
                          cotisationId={row.id}
                          remaining={row.dueAmount - row.paidAmount}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <CotisationsPagination
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
