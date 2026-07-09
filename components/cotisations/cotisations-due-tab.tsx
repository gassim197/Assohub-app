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
import { formatPeriodLabel } from "@/lib/cotisations/generation";
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
import { CotisationsDueToolbar } from "./cotisations-due-toolbar";
import { CotisationsDueRowActions } from "./cotisations-due-row-actions";
import { CotisationsPagination } from "./cotisations-pagination";

function statusBadge(
  row: CotisationWithRelationsRow,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  const cotisationStatus = isCotisationStatus(row.status) ? row.status : null;
  return (
    <Badge variant={cotisationStatus ? STATUS_BADGE_VARIANT[cotisationStatus] : "outline"}>
      {cotisationStatus ? t(`status.${STATUS_I18N_KEY[cotisationStatus]}`) : row.status}
    </Badge>
  );
}

/**
 * Onglet "Cotisations dues" (checkpoint 3, session 5A) : toutes les
 * cotisations en_attente + en_retard, filtrables, paginées 20/page.
 * Server Component : la liste est déjà chargée par la page parente selon les
 * filtres résolus depuis l'URL.
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
                      <TableCell className="tabular-nums">
                        {formatCurrency(row.dueAmount, locale)}
                      </TableCell>
                      <TableCell>{statusBadge(row, t)}</TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {dateFormatter.format(new Date(row.dueDate))}
                      </TableCell>
                      <TableCell className="text-right">
                        <CotisationsDueRowActions
                          orgSlug={orgSlug}
                          memberId={row.memberId}
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
