import { BarChart3 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import {
  DEFAULT_REPORTS_PERIOD,
  isReportsPeriodOption,
  resolveReportsPeriod,
} from "@/lib/reports/period";
import {
  getCategoryBreakdown,
  getFinancialKpis,
  getMonthlyBreakdown,
} from "@/lib/reports/queries";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryChart } from "./category-chart";
import { FinancialKpisCards } from "./financial-kpis";
import { MonthlyChart } from "./monthly-chart";
import { ReportsPeriodFilter } from "./reports-period-filter";

/**
 * Contenu de l'onglet "Vue d'ensemble" (checkpoint 2, session 7) : filtre de
 * période (dans l'URL, portée limitée à cet onglet), 3 KPI cards, évolution
 * mensuelle et répartition par catégorie. Server Component : toutes les
 * agrégations sont calculées côté serveur pour la période résolue.
 */
export async function OverviewTab({
  organizationId,
  overviewPeriod,
  overviewFrom,
  overviewTo,
}: {
  organizationId: string;
  overviewPeriod?: string;
  overviewFrom?: string;
  overviewTo?: string;
}) {
  const t = await getTranslations("reports.overview");

  const option =
    overviewPeriod && isReportsPeriodOption(overviewPeriod)
      ? overviewPeriod
      : DEFAULT_REPORTS_PERIOD;
  const period = resolveReportsPeriod(option, { from: overviewFrom, to: overviewTo });

  const [kpis, monthly, revenueCategories, expenseCategories] = await Promise.all([
    getFinancialKpis(organizationId, period),
    getMonthlyBreakdown(organizationId, period),
    getCategoryBreakdown(organizationId, period, "revenue"),
    getCategoryBreakdown(organizationId, period, "expense"),
  ]);

  const isEmpty = kpis.totalRevenue === 0 && kpis.totalExpense === 0;

  return (
    <div className="space-y-6">
      <ReportsPeriodFilter />

      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-6 rounded-full bg-primary/10 p-4">
              <BarChart3 className="size-10 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">{t("empty.title")}</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {t("empty.description")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <FinancialKpisCards kpis={kpis} />

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 text-sm font-medium text-foreground">
                {t("monthlyChartTitle")}
              </h2>
              <Card>
                <CardContent>
                  <MonthlyChart data={monthly} />
                </CardContent>
              </Card>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-medium text-foreground">
                {t("categoryChartTitle")}
              </h2>
              <Card>
                <CardContent>
                  <CategoryChart
                    revenueData={revenueCategories}
                    expenseData={expenseCategories}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
