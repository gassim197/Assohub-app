import { BarChart2, Calendar, CreditCard, Users } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import type { MemberKpis } from "@/lib/members/queries";
import type { CotisationKpis } from "@/lib/cotisations/queries";
import type { FinancialKpis } from "@/lib/reports/queries";
import type { MeetingRow } from "@/lib/meetings/queries";
import { formatMeetingDateTime } from "@/lib/meetings/date";
import { formatCurrency } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";

/**
 * 4 KPI cards du tableau de bord (checkpoint 1, session 8A) — pure
 * agrégation à l'affichage à partir de requêtes déjà existantes dans chaque
 * module (`getMemberKpis`, `getCotisationKpis`, `getFinancialKpis`,
 * `listUpcomingMeetings`), aucune nouvelle règle métier. Même patron visuel
 * que `FinancialKpisCards`/`MeetingsKpis` (`Card size="sm"` + label muted +
 * valeur `2xl` `tabular-nums`), mais 4 cartes visuellement uniformes (pas de
 * carte navy mise en évidence — ce traitement reste propre aux 3 KPI de
 * Rapports).
 */
export async function DashboardKpis({
  memberKpis,
  cotisationKpis,
  financialKpis,
  nextMeeting,
}: {
  memberKpis: MemberKpis;
  cotisationKpis: CotisationKpis;
  financialKpis: FinancialKpis;
  nextMeeting: MeetingRow | null;
}) {
  const [t, locale] = await Promise.all([
    getTranslations("dashboard.overview.kpis"),
    getLocale(),
  ]);

  const isPositiveBalance = financialKpis.netBalance >= 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card size="sm">
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="size-4" />
            <p className="text-sm">{t("activeMembers")}</p>
          </div>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {memberKpis.activeTotal}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="size-4" />
            <p className="text-sm">{t("outstanding")}</p>
          </div>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatCurrency(cotisationKpis.outstanding, locale)}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("lateCount", { count: cotisationKpis.lateCount })}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <BarChart2 className="size-4" />
            <p className="text-sm">{t("netBalance")}</p>
          </div>
          <p
            className={`mt-1 text-2xl font-semibold tabular-nums ${isPositiveBalance ? "text-success" : "text-destructive"}`}
          >
            {formatCurrency(financialKpis.netBalance, locale)}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="size-4" />
            <p className="text-sm">{t("nextMeeting")}</p>
          </div>
          {nextMeeting ? (
            <>
              <p className="mt-1 truncate text-base font-semibold text-foreground">
                {nextMeeting.title}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatMeetingDateTime(nextMeeting.scheduledAt, locale)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{t("noneScheduled")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
