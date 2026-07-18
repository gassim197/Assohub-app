import { Text, View } from "@react-pdf/renderer";

import type { CategoryBreakdownRow, MonthlyBreakdownRow } from "@/lib/reports/queries";
import { PDF_CATEGORY_COLORS, PDF_COLORS } from "./colors";
import { formatCurrencyPdf } from "./format";

/**
 * Graphiques du rapport PDF (checkpoint 4) — reconstruction statique des
 * graphiques recharts de la vue d'ensemble (`monthly-chart.tsx`,
 * `category-chart.tsx`), PAS un rendu de ces composants (recharts dépend du
 * DOM réel, impossible côté serveur). Barres dessinées avec des `View`
 * flexbox (largeur/hauteur en `%`) plutôt qu'en SVG : plus simple, aussi
 * fiable pour un document statique. Mêmes couleurs sémantiques que l'app
 * (`PDF_COLORS`, cf. stratégie checkpoint 4).
 */

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

const CHART_HEIGHT = 130;

export function PdfMonthlyChart({
  data,
  locale,
  revenueLabel,
  expenseLabel,
}: {
  data: MonthlyBreakdownRow[];
  locale: string;
  revenueLabel: string;
  expenseLabel: string;
}) {
  const maxValue = Math.max(1, ...data.map((row) => Math.max(row.revenue, row.expense)));

  return (
    <View>
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 8 }}>
        <LegendDot color={PDF_COLORS.success} label={revenueLabel} />
        <LegendDot color={PDF_COLORS.destructive} label={expenseLabel} />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          height: CHART_HEIGHT,
          borderBottom: `1pt solid ${PDF_COLORS.border}`,
          gap: 4,
        }}
      >
        {data.map((row) => (
          <View
            key={row.month}
            style={{ flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 2 }}
          >
            <View
              style={{
                flex: 1,
                height: Math.max(1, (row.revenue / maxValue) * CHART_HEIGHT),
                backgroundColor: PDF_COLORS.success,
                borderTopLeftRadius: 1,
                borderTopRightRadius: 1,
              }}
            />
            <View
              style={{
                flex: 1,
                height: Math.max(1, (row.expense / maxValue) * CHART_HEIGHT),
                backgroundColor: PDF_COLORS.destructive,
                borderTopLeftRadius: 1,
                borderTopRightRadius: 1,
              }}
            />
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
        {data.map((row) => (
          <Text
            key={row.month}
            style={{ flex: 1, fontSize: 6.5, color: PDF_COLORS.mutedForeground, textAlign: "center" }}
          >
            {formatMonthLabel(row.month, locale)}
          </Text>
        ))}
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }} />
      <Text style={{ fontSize: 8, color: PDF_COLORS.mutedForeground }}>{label}</Text>
    </View>
  );
}

export function PdfCategoryBarList({
  title,
  data,
  total,
  locale,
  categoryLabel,
  emptyLabel,
}: {
  title: string;
  data: CategoryBreakdownRow[];
  total: number;
  locale: string;
  categoryLabel: (category: string) => string;
  emptyLabel: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: PDF_COLORS.foreground, marginBottom: 6 }}>
        {title}
      </Text>

      {data.length === 0 ? (
        <Text style={{ fontSize: 8, color: PDF_COLORS.mutedForeground }}>{emptyLabel}</Text>
      ) : (
        data.map((row, index) => {
          const percent = total > 0 ? Math.round((row.amount / total) * 100) : 0;
          const color = PDF_CATEGORY_COLORS[index % PDF_CATEGORY_COLORS.length]!;
          return (
            <View key={row.category} style={{ marginBottom: 5 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                <Text style={{ fontSize: 7.5, color: PDF_COLORS.foreground }}>
                  {categoryLabel(row.category)}
                </Text>
                <Text style={{ fontSize: 7.5, color: PDF_COLORS.mutedForeground }}>
                  {formatCurrencyPdf(row.amount, locale)} ({percent}%)
                </Text>
              </View>
              <View style={{ height: 4, backgroundColor: PDF_COLORS.muted, borderRadius: 2 }}>
                <View
                  style={{
                    width: `${percent}%`,
                    height: 4,
                    backgroundColor: color,
                    borderRadius: 2,
                  }}
                />
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
