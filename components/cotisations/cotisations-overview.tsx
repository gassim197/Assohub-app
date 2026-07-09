import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import type { CotisationTypeRow } from "@/lib/cotisations/queries";
import type { CotisationKpis, CotisationWithRelationsRow } from "@/lib/cotisations/queries";
import type { RecentPaymentRow } from "@/lib/cotisations/payment-queries";
import {
  STATUS_BADGE_VARIANT,
  STATUS_I18N_KEY,
  isCotisationFrequency,
  isCotisationStatus,
} from "@/lib/cotisations/constants";
import { isPaymentMethod } from "@/lib/cotisations/payment-constants";
import { formatPeriodLabel } from "@/lib/cotisations/period";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
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

/**
 * Onglet "Vue d'ensemble" (checkpoint 3, session 5A) : KPIs + 10 dernières
 * cotisations créées/modifiées. Server Component : tout est déjà chargé par
 * la page parente (`requireOrgAccess` + `ensureCotisationsGenerated` + queries).
 */
export async function CotisationsOverview({
  orgSlug,
  types,
  kpis,
  recent,
  recentPayments,
}: {
  orgSlug: string;
  types: CotisationTypeRow[];
  kpis: CotisationKpis;
  recent: CotisationWithRelationsRow[];
  recentPayments: RecentPaymentRow[];
}) {
  const [t, tMethod, locale] = await Promise.all([
    getTranslations("cotisations"),
    getTranslations("cotisations.paymentMethod"),
    getLocale(),
  ]);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  // Aucun type défini : empty state engageant, porte d'entrée vers la création.
  if (types.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-6 rounded-full bg-primary/10 p-4">
            <ListChecks className="size-10 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">{t("dashboard.noTypes.title")}</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {t("dashboard.noTypes.description")}
          </p>
          <Button
            className="mt-6"
            render={<Link href={`/${orgSlug}/cotisations?newType=true`} />}
          >
            <Plus />
            {t("dashboard.noTypes.cta")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const kpiCards = [
    { key: "collected", label: t("dashboard.kpis.collected"), value: formatCurrency(kpis.collectedThisMonth, locale) },
    { key: "outstanding", label: t("dashboard.kpis.outstanding"), value: formatCurrency(kpis.outstanding, locale) },
    { key: "late", label: t("dashboard.kpis.late"), value: String(kpis.lateCount) },
    { key: "upToDate", label: t("dashboard.kpis.upToDate"), value: String(kpis.upToDateCount) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.key} size="sm">
            <CardContent>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">
          {t("dashboard.recent.title")}
        </h2>

        {recent.length === 0 ? (
          <Card className="px-6 py-16 text-center text-sm text-muted-foreground">
            {t("dashboard.recent.empty")}
          </Card>
        ) : (
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("due.table.member")}</TableHead>
                  <TableHead>{t("due.table.type")}</TableHead>
                  <TableHead>{t("due.table.period")}</TableHead>
                  <TableHead>{t("due.table.dueAmount")}</TableHead>
                  <TableHead>{t("due.table.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((row) => {
                  const cotisationStatus = isCotisationStatus(row.status)
                    ? row.status
                    : null;
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
                      <TableCell>
                        <Badge
                          variant={
                            cotisationStatus
                              ? STATUS_BADGE_VARIANT[cotisationStatus]
                              : "outline"
                          }
                        >
                          {cotisationStatus
                            ? t(`status.${STATUS_I18N_KEY[cotisationStatus]}`)
                            : row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">
          {t("dashboard.recentPayments.title")}
        </h2>

        {recentPayments.length === 0 ? (
          <Card className="px-6 py-16 text-center text-sm text-muted-foreground">
            {t("dashboard.recentPayments.empty")}
          </Card>
        ) : (
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("due.table.member")}</TableHead>
                  <TableHead>{t("payments.detailDialog.amount")}</TableHead>
                  <TableHead>{t("payments.form.paymentMethod")}</TableHead>
                  <TableHead>{t("payments.form.paidAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium text-foreground">
                      {payment.memberFullName}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatCurrency(payment.amount, locale)}
                    </TableCell>
                    <TableCell>
                      {isPaymentMethod(payment.paymentMethod)
                        ? tMethod(payment.paymentMethod)
                        : payment.paymentMethod}
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {dateFormatter.format(new Date(payment.paidAt))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
