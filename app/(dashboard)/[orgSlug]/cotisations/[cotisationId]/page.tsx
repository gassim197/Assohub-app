import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { requireOrgAccess } from "@/lib/auth/org";
import {
  getCotisationSummary,
  getPaymentById,
  listPaymentsForCotisation,
} from "@/lib/cotisations/payment-queries";
import {
  STATUS_BADGE_VARIANT,
  STATUS_I18N_KEY,
  isCotisationFrequency,
  isCotisationStatus,
} from "@/lib/cotisations/constants";
import { formatPeriodLabel } from "@/lib/cotisations/period";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PaymentHistoryTable } from "@/components/cotisations/payment-history-table";
import { RecordPaymentDialog } from "@/components/cotisations/record-payment-dialog";

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function CotisationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; cotisationId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { orgSlug, cotisationId } = await params;
  const sp = await searchParams;
  const { organizationId } = await requireOrgAccess(orgSlug);

  // getCotisationSummary est borné au tenant et exclut les archivées : une
  // cotisation d'une autre organisation (ou supprimée) renvoie null → 404 propre.
  const cotisation = await getCotisationSummary(organizationId, cotisationId);
  if (!cotisation) {
    notFound();
  }

  const [t, locale, payments] = await Promise.all([
    getTranslations("cotisations"),
    getLocale(),
    listPaymentsForCotisation(organizationId, cotisationId),
  ]);

  // Édition en place : `?editPayment=true&paymentId=X` monte la modal pré-remplie.
  const editPaymentId =
    sp.editPayment === "true" ? readParam(sp.paymentId) : undefined;
  const editPayment = editPaymentId
    ? await getPaymentById(organizationId, editPaymentId)
    : null;

  const frequency = isCotisationFrequency(cotisation.frequency)
    ? cotisation.frequency
    : "monthly";
  const periodLabel = formatPeriodLabel(cotisation.periodStart, frequency, locale);

  const status = isCotisationStatus(cotisation.status) ? cotisation.status : null;
  const statusLabel = status ? t(`status.${STATUS_I18N_KEY[status]}`) : cotisation.status;
  const statusVariant = status ? STATUS_BADGE_VARIANT[status] : "outline";

  const remaining = Math.max(0, cotisation.dueAmount - cotisation.paidAmount);

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href={`/${orgSlug}/cotisations`} />}
      >
        <ArrowLeft />
        {t("detail.backToList")}
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {cotisation.memberFullName}
            </h1>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {cotisation.typeName} — {periodLabel}
          </p>
        </div>

        {remaining > 0 ? (
          <Button
            size="sm"
            render={
              <Link
                href={`/${orgSlug}/cotisations/${cotisationId}?recordPayment=true`}
              />
            }
          >
            <Plus />
            {t("detail.newPayment")}
          </Button>
        ) : (
          <Button size="sm" disabled>
            <Plus />
            {t("detail.newPayment")}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">{t("payments.dialog.dueAmount")}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatCurrency(cotisation.dueAmount, locale)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("payments.dialog.paidAmount")}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatCurrency(cotisation.paidAmount, locale)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("payments.dialog.remaining")}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-primary">
              {formatCurrency(remaining, locale)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("due.table.status")}</p>
            <p className="mt-1">
              <Badge variant={statusVariant}>{statusLabel}</Badge>
            </p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">
          {t("detail.historyTitle")}
        </h2>
        <PaymentHistoryTable orgSlug={orgSlug} cotisation={cotisation} payments={payments} />
      </div>

      <RecordPaymentDialog orgSlug={orgSlug} cotisation={cotisation} />
      {editPayment ? (
        <RecordPaymentDialog
          orgSlug={orgSlug}
          cotisation={cotisation}
          payment={editPayment}
        />
      ) : null}
    </div>
  );
}
