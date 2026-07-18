import type { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getLocale, getTranslations } from "next-intl/server";

import { requireOrgAccess } from "@/lib/auth/org";
import {
  getCategoryBreakdown,
  getFinancialKpis,
  getMonthlyBreakdown,
  listAllTransactionsForPeriod,
} from "@/lib/reports/queries";
import {
  DEFAULT_REPORTS_PERIOD,
  isReportsPeriodOption,
  resolveReportsPeriod,
} from "@/lib/reports/period";
import {
  EXPENSE_CATEGORIES,
  REVENUE_CATEGORIES,
  type ExpenseCategory,
  type RevenueCategory,
} from "@/lib/reports/constants";
import { ReportPdfDocument, type ReportPdfStrings } from "@/lib/reports/pdf/report-document";

// `@react-pdf/renderer` a besoin des API Node (Buffer) — jamais exécutable sur
// l'Edge runtime.
export const runtime = "nodejs";

// U+0300..U+036F, diacritiques combinants isolés par `.normalize("NFD")`.
const COMBINING_DIACRITICS_RE = /[̀-ͯ]/g;

/** Diacritiques retirés via NFD (e.g. "e" + accent) avant de couper le reste en tirets. */
function slugifyFilenamePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS_RE, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/**
 * Génère le rapport financier PDF (checkpoint 4, session 7). Filtré par la
 * même période que la Vue d'ensemble (`?period=`, `?from=`, `?to=`, mêmes
 * options que `resolveReportsPeriod`). Génération 100% côté serveur, aucune
 * dépendance navigateur (stratégie validée : `@react-pdf/renderer`, pas de
 * Puppeteer) — voir `lib/reports/pdf/`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const { orgSlug } = await params;
  const { organizationId, organization } = await requireOrgAccess(orgSlug);

  const searchParams = request.nextUrl.searchParams;
  const rawPeriod = searchParams.get("period");
  const periodOption =
    rawPeriod && isReportsPeriodOption(rawPeriod) ? rawPeriod : DEFAULT_REPORTS_PERIOD;
  const period = resolveReportsPeriod(periodOption, {
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  const [locale, tPdf, tKpis, tOverview, tCharts, tTransactions, tCategoryRevenue, tCategoryExpense, tAuth] =
    await Promise.all([
      getLocale(),
      getTranslations("reports.pdf"),
      getTranslations("reports.kpis"),
      getTranslations("reports.overview"),
      getTranslations("reports.charts"),
      getTranslations("reports.transactions"),
      getTranslations("reports.categories.revenue"),
      getTranslations("reports.categories.expense"),
      getTranslations("auth"),
    ]);

  const [kpis, monthly, revenueCategories, expenseCategories, transactions] = await Promise.all([
    getFinancialKpis(organizationId, period),
    getMonthlyBreakdown(organizationId, period),
    getCategoryBreakdown(organizationId, period, "revenue"),
    getCategoryBreakdown(organizationId, period, "expense"),
    listAllTransactionsForPeriod(organizationId, period),
  ]);

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  const periodCoveredLabel = `${dateFormatter.format(new Date(`${period.start}T00:00:00Z`))} – ${dateFormatter.format(new Date(`${period.end}T00:00:00Z`))}`;
  const generatedAtLabel = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  const strings: ReportPdfStrings = {
    title: tPdf("title"),
    periodLabel: tPdf("periodLabel"),
    generatedAtLabel: tPdf("generatedAtLabel"),
    kpiRevenue: tKpis("totalRevenue"),
    kpiExpense: tKpis("totalExpense"),
    kpiNet: tKpis("netBalance"),
    chartRevenueLabel: tCharts("revenue"),
    chartExpenseLabel: tCharts("expense"),
    monthlyChartTitle: tOverview("monthlyChartTitle"),
    categoryChartTitle: tOverview("categoryChartTitle"),
    revenueCategoryTitle: tPdf("revenueCategoryTitle"),
    expenseCategoryTitle: tPdf("expenseCategoryTitle"),
    noCategoryData: tCharts("noCategoryData"),
    transactionsTitle: tPdf("transactionsTitle"),
    noTransactions: tPdf("noTransactions"),
    table: {
      date: tTransactions("table.date"),
      type: tTransactions("table.type"),
      category: tTransactions("table.category"),
      description: tTransactions("table.description"),
      amount: tTransactions("table.amount"),
      recordedBy: tTransactions("table.recordedBy"),
    },
    types: {
      revenue: tTransactions("types.revenue"),
      expense: tTransactions("types.expense"),
    },
    footer: `${tPdf("footerPrefix")} — ${tAuth("tagline")}`,
  };

  const buffer = await renderToBuffer(
    ReportPdfDocument({
      organizationName: organization.name,
      periodCoveredLabel,
      generatedAtLabel,
      locale,
      kpis,
      monthly,
      revenueCategories,
      expenseCategories,
      transactions,
      categoryLabelRevenue: (category) =>
        (REVENUE_CATEGORIES as readonly string[]).includes(category)
          ? tCategoryRevenue(category as RevenueCategory)
          : category,
      categoryLabelExpense: (category) =>
        (EXPENSE_CATEGORIES as readonly string[]).includes(category)
          ? tCategoryExpense(category as ExpenseCategory)
          : category,
      strings,
    }),
  );

  const filename = `${tPdf("filenamePrefix")}-${slugifyFilenamePart(organization.name)}-${period.start}-${period.end}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
