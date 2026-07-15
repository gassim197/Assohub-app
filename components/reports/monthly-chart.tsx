"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocale, useTranslations } from "next-intl";

import type { MonthlyBreakdownRow } from "@/lib/reports/queries";
import { formatCurrency } from "@/lib/currency";

function formatMonthLabel(month: string, locale: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (monthIndex ?? 1) - 1, 1));
  const formatted = new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Évolution mensuelle (checkpoint 2) : barres groupées revenus vs dépenses,
 * couleurs des tokens du design system (`--success`/`--destructive`, pas de
 * couleur en dur). Les montants viennent en centimes de `getMonthlyBreakdown`
 * — convertis en unités GNF avant le graphique, reconvertis dans le tooltip.
 */
export function MonthlyChart({ data }: { data: MonthlyBreakdownRow[] }) {
  const t = useTranslations("reports.charts");
  const locale = useLocale();

  const chartData = data.map((row) => ({
    month: formatMonthLabel(row.month, locale),
    revenue: row.revenue / 100,
    expense: row.expense / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={72}
          tickFormatter={(value: number) =>
            new Intl.NumberFormat(locale, { notation: "compact" }).format(value)
          }
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          formatter={(value) => formatCurrency(Number(value) * 100, locale)}
          contentStyle={{
            borderRadius: 8,
            borderColor: "var(--border)",
            fontSize: 13,
          }}
        />
        <Legend
          formatter={(value: string) => (value === "revenue" ? t("revenue") : t("expense"))}
        />
        <Bar dataKey="revenue" name="revenue" fill="var(--success)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="expense" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
