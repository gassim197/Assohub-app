import Link from "next/link";
import { ChevronRight, PartyPopper } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import type { CotisationWithRelationsRow } from "@/lib/cotisations/queries";
import { isCotisationFrequency } from "@/lib/cotisations/constants";
import { formatPeriodLabel } from "@/lib/cotisations/period";
import { formatCurrency } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";

const PREVIEW_COUNT = 3;

/**
 * Section "Cotisations en retard" du tableau de bord (checkpoint 2, session
 * 8A) : aperçu des membres avec cotisation `en_retard`. `overdue` provient
 * de `listCotisationsDue({ status: "en_retard" })` (`lib/cotisations/queries.ts`),
 * déjà triée par échéance croissante — tronquée ici, aucune nouvelle règle
 * métier.
 */
export async function OverdueCotisationsSection({
  orgSlug,
  overdue,
}: {
  orgSlug: string;
  overdue: CotisationWithRelationsRow[];
}) {
  const [t, locale] = await Promise.all([
    getTranslations("dashboard.overview.activity.cotisations"),
    getLocale(),
  ]);

  const preview = overdue.slice(0, PREVIEW_COUNT);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">{t("title")}</h2>
        <Link
          href={`/${orgSlug}/cotisations`}
          className="flex items-center gap-0.5 text-sm font-medium text-primary hover:underline"
        >
          {t("viewAll")}
          <ChevronRight className="size-3.5" />
        </Link>
      </div>

      <Card>
        <CardContent>
          {preview.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <PartyPopper className="mb-2 size-8 text-success" />
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {preview.map((cotisation) => {
                const frequency = isCotisationFrequency(cotisation.frequency)
                  ? cotisation.frequency
                  : "monthly";
                const due = cotisation.dueAmount - cotisation.paidAmount;
                return (
                  <li
                    key={cotisation.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {cotisation.memberFullName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatPeriodLabel(cotisation.periodStart, frequency, locale)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-destructive">
                      {formatCurrency(due, locale)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
