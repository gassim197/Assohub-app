"use client";

import { useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useLocale, useTranslations } from "next-intl";

import type { CategoryBreakdownRow } from "@/lib/reports/queries";
import { isExpenseCategory, isRevenueCategory } from "@/lib/reports/constants";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Palette cyclique pour les catégories (checkpoint 2) — tokens du design
 * system uniquement (`--chart-1`..`--chart-5` + accents sémantiques), aucune
 * couleur en dur. 9 couleurs distinctes couvrent les 10 catégories de
 * dépenses au prix d'une seule répétition en fin de cycle, acceptable pour un
 * donut où les tranches les plus petites sont rarement adjacentes.
 */
const CATEGORY_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--warning)",
  "var(--info)",
  "var(--success)",
  "var(--destructive)",
];

interface ChartDatum {
  category: string;
  label: string;
  amount: number;
  percent: number;
  color: string;
}

/**
 * Répartition par catégorie (checkpoint 2) : donut avec un sélecteur
 * Revenus/Dépenses (plutôt que deux camemberts côte à côte — plus lisible,
 * meilleur comportement mobile, décision prise au checkpoint initial).
 */
export function CategoryChart({
  revenueData,
  expenseData,
}: {
  revenueData: CategoryBreakdownRow[];
  expenseData: CategoryBreakdownRow[];
}) {
  const t = useTranslations("reports.charts");
  const tCategoryRevenue = useTranslations("reports.categories.revenue");
  const tCategoryExpense = useTranslations("reports.categories.expense");
  const locale = useLocale();
  const [type, setType] = useState<"revenue" | "expense">("revenue");

  const data = type === "revenue" ? revenueData : expenseData;
  const total = data.reduce((sum, row) => sum + row.amount, 0);

  const chartData: ChartDatum[] = data.map((row, index) => ({
    category: row.category,
    label:
      type === "revenue"
        ? isRevenueCategory(row.category)
          ? tCategoryRevenue(row.category)
          : row.category
        : isExpenseCategory(row.category)
          ? tCategoryExpense(row.category)
          : row.category,
    amount: row.amount / 100,
    percent: total > 0 ? Math.round((row.amount / total) * 100) : 0,
    color: CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length]!,
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={type === "revenue" ? "default" : "outline"}
          onClick={() => setType("revenue")}
        >
          {t("revenue")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={type === "expense" ? "default" : "outline"}
          onClick={() => setType("expense")}
        >
          {t("expense")}
        </Button>
      </div>

      {chartData.length === 0 ? (
        <p className={cn("py-16 text-center text-sm text-muted-foreground")}>
          {t("noCategoryData")}
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="amount"
              nameKey="label"
              innerRadius={55}
              outerRadius={95}
              paddingAngle={2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.category} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => [
                formatCurrency(Number(value) * 100, locale),
                (item.payload as ChartDatum).label,
              ]}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              formatter={(_value, entry) => {
                const payload = entry.payload as ChartDatum | undefined;
                return payload ? `${payload.label} (${payload.percent}%)` : null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
