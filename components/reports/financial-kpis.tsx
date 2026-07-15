import { TrendingDown, TrendingUp } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import type { FinancialKpis } from "@/lib/reports/queries";
import { formatCurrency } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";

/**
 * 3 KPI cards du dashboard financier (checkpoint 2) : revenus (vert),
 * dépenses (rouge), solde net (carte navy mise en évidence, cf. décision
 * produit). Même patron visuel que les KPI cards des autres modules (`Card
 * size="sm"` + libellé muted + valeur en 2xl tabular-nums).
 */
export async function FinancialKpisCards({ kpis }: { kpis: FinancialKpis }) {
  const [t, locale] = await Promise.all([
    getTranslations("reports.kpis"),
    getLocale(),
  ]);

  const isPositive = kpis.netBalance >= 0;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card size="sm">
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("totalRevenue")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-success">
            {formatCurrency(kpis.totalRevenue, locale)}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("totalExpense")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-destructive">
            {formatCurrency(kpis.totalExpense, locale)}
          </p>
        </CardContent>
      </Card>

      <Card size="sm" className="bg-sidebar">
        <CardContent>
          <p className="text-sm text-sidebar-foreground/70">{t("netBalance")}</p>
          <p className="mt-1 flex items-center gap-1.5 text-2xl font-semibold tabular-nums text-sidebar-foreground">
            {isPositive ? (
              <TrendingUp className="size-5 text-success" />
            ) : (
              <TrendingDown className="size-5 text-destructive" />
            )}
            {formatCurrency(kpis.netBalance, locale)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
