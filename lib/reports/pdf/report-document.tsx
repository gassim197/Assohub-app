import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type {
  CategoryBreakdownRow,
  FinancialKpis,
  MonthlyBreakdownRow,
  TransactionWithRecorderRow,
} from "@/lib/reports/queries";
import { isExpenseCategory, isRevenueCategory } from "@/lib/reports/constants";
import { PDF_COLORS } from "./colors";
import { formatCurrencyPdf } from "./format";
import { PdfBrand } from "./logo";
import { PdfCategoryBarList, PdfMonthlyChart } from "./charts";

/**
 * Document PDF du rapport financier (checkpoint 4, session 7). Toutes les
 * chaînes traduites sont résolues côté appelant (`getTranslations`, route
 * handler) et passées en props : ce composant est rendu par
 * `renderToBuffer`/`renderToStream`, un arbre React totalement séparé de
 * celui de Next.js — pas de `NextIntlClientProvider` ici, donc `useTranslations`
 * ne fonctionnerait pas.
 */

export interface ReportPdfStrings {
  title: string;
  periodLabel: string;
  generatedAtLabel: string;
  kpiRevenue: string;
  kpiExpense: string;
  kpiNet: string;
  chartRevenueLabel: string;
  chartExpenseLabel: string;
  monthlyChartTitle: string;
  categoryChartTitle: string;
  revenueCategoryTitle: string;
  expenseCategoryTitle: string;
  noCategoryData: string;
  transactionsTitle: string;
  noTransactions: string;
  table: {
    date: string;
    type: string;
    category: string;
    description: string;
    amount: string;
    recordedBy: string;
  };
  types: { revenue: string; expense: string };
  footer: string;
}

export interface ReportPdfProps {
  organizationName: string;
  periodCoveredLabel: string;
  generatedAtLabel: string;
  locale: string;
  kpis: FinancialKpis;
  monthly: MonthlyBreakdownRow[];
  revenueCategories: CategoryBreakdownRow[];
  expenseCategories: CategoryBreakdownRow[];
  transactions: TransactionWithRecorderRow[];
  categoryLabelRevenue: (category: string) => string;
  categoryLabelExpense: (category: string) => string;
  strings: ReportPdfStrings;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 32,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: PDF_COLORS.foreground,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 14,
    borderBottom: `1pt solid ${PDF_COLORS.border}`,
  },
  headerRight: { alignItems: "flex-end" },
  reportTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: PDF_COLORS.foreground },
  orgName: { fontSize: 10, color: PDF_COLORS.mutedForeground, marginTop: 2 },
  metaLine: { fontSize: 8, color: PDF_COLORS.mutedForeground, marginTop: 3 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.foreground,
    marginBottom: 8,
  },
  section: { marginBottom: 20 },
  kpiRow: { flexDirection: "row", gap: 10 },
  kpiCard: {
    flex: 1,
    borderRadius: 6,
    padding: 10,
    backgroundColor: PDF_COLORS.muted,
  },
  kpiLabel: { fontSize: 8, color: PDF_COLORS.mutedForeground },
  kpiValue: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 3 },
  categoryRow: { flexDirection: "row", gap: 24 },
  table: { borderTop: `1pt solid ${PDF_COLORS.border}` },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: PDF_COLORS.muted,
    paddingVertical: 5,
    paddingHorizontal: 4,
    gap: 6,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottom: `0.5pt solid ${PDF_COLORS.border}`,
    gap: 6,
  },
  tableHeaderCell: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: PDF_COLORS.mutedForeground },
  tableCell: { fontSize: 7.5, color: PDF_COLORS.foreground },
  colDate: { width: "11%" },
  colType: { width: "9%" },
  colCategory: { width: "16%" },
  colDescription: { width: "30%" },
  colAmount: { width: "14%", textAlign: "right" },
  colRecordedBy: { width: "13%" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    textAlign: "center",
    fontSize: 7,
    color: PDF_COLORS.mutedForeground,
  },
});

export function ReportPdfDocument({
  organizationName,
  periodCoveredLabel,
  generatedAtLabel,
  locale,
  kpis,
  monthly,
  revenueCategories,
  expenseCategories,
  transactions,
  categoryLabelRevenue,
  categoryLabelExpense,
  strings: s,
}: ReportPdfProps) {
  const totalRevenue = revenueCategories.reduce((sum, row) => sum + row.amount, 0);
  const totalExpense = expenseCategories.reduce((sum, row) => sum + row.amount, 0);

  function transactionCategoryLabel(category: string): string {
    if (isRevenueCategory(category)) return categoryLabelRevenue(category);
    if (isExpenseCategory(category)) return categoryLabelExpense(category);
    return category;
  }

  return (
    <Document title={`${s.title} — ${organizationName}`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <PdfBrand />
          <View style={styles.headerRight}>
            <Text style={styles.reportTitle}>{s.title}</Text>
            <Text style={styles.orgName}>{organizationName}</Text>
            <Text style={styles.metaLine}>
              {s.periodLabel} : {periodCoveredLabel}
            </Text>
            <Text style={styles.metaLine}>
              {s.generatedAtLabel} : {generatedAtLabel}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{s.kpiRevenue}</Text>
              <Text style={[styles.kpiValue, { color: PDF_COLORS.success }]}>
                {formatCurrencyPdf(kpis.totalRevenue, locale)}
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{s.kpiExpense}</Text>
              <Text style={[styles.kpiValue, { color: PDF_COLORS.destructive }]}>
                {formatCurrencyPdf(kpis.totalExpense, locale)}
              </Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: PDF_COLORS.navy }]}>
              <Text style={[styles.kpiLabel, { color: "#CBD5E1" }]}>{s.kpiNet}</Text>
              <Text style={[styles.kpiValue, { color: "#FFFFFF" }]}>
                {formatCurrencyPdf(kpis.netBalance, locale)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>{s.monthlyChartTitle}</Text>
          <PdfMonthlyChart
            data={monthly}
            locale={locale}
            revenueLabel={s.chartRevenueLabel}
            expenseLabel={s.chartExpenseLabel}
          />
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>{s.categoryChartTitle}</Text>
          <View style={styles.categoryRow}>
            <PdfCategoryBarList
              title={s.revenueCategoryTitle}
              data={revenueCategories}
              total={totalRevenue}
              locale={locale}
              categoryLabel={categoryLabelRevenue}
              emptyLabel={s.noCategoryData}
            />
            <PdfCategoryBarList
              title={s.expenseCategoryTitle}
              data={expenseCategories}
              total={totalExpense}
              locale={locale}
              categoryLabel={categoryLabelExpense}
              emptyLabel={s.noCategoryData}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{s.transactionsTitle}</Text>

          {transactions.length === 0 ? (
            <Text style={{ fontSize: 8, color: PDF_COLORS.mutedForeground }}>
              {s.noTransactions}
            </Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, styles.colDate]}>{s.table.date}</Text>
                <Text style={[styles.tableHeaderCell, styles.colType]}>{s.table.type}</Text>
                <Text style={[styles.tableHeaderCell, styles.colCategory]}>{s.table.category}</Text>
                <Text style={[styles.tableHeaderCell, styles.colDescription]}>
                  {s.table.description}
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colAmount]}>{s.table.amount}</Text>
                <Text style={[styles.tableHeaderCell, styles.colRecordedBy]}>
                  {s.table.recordedBy}
                </Text>
              </View>

              {transactions.map((row) => {
                const isRevenue = row.type === "revenue";
                return (
                  <View key={row.id} style={styles.tableRow} wrap={false}>
                    <Text style={[styles.tableCell, styles.colDate]}>
                      {new Intl.DateTimeFormat(locale, { dateStyle: "short" }).format(
                        new Date(row.occurredAt),
                      )}
                    </Text>
                    <Text style={[styles.tableCell, styles.colType]}>
                      {isRevenue ? s.types.revenue : s.types.expense}
                    </Text>
                    <Text style={[styles.tableCell, styles.colCategory]}>
                      {transactionCategoryLabel(row.category)}
                    </Text>
                    <Text style={[styles.tableCell, styles.colDescription]}>
                      {row.description}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.colAmount,
                        { color: isRevenue ? PDF_COLORS.success : PDF_COLORS.destructive },
                      ]}
                    >
                      {formatCurrencyPdf(row.amount, locale)}
                    </Text>
                    <Text style={[styles.tableCell, styles.colRecordedBy]}>
                      {row.recordedByName}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <Text style={styles.footer} fixed>
          {s.footer}
        </Text>
      </Page>
    </Document>
  );
}
