import { getTranslations } from "next-intl/server";

import { requireOrgAccess } from "@/lib/auth/org";
import { listExpenses, listManualRevenues, listTransactions } from "@/lib/reports/queries";
import {
  isExpenseCategory,
  isRevenueCategory,
  isTransactionType,
} from "@/lib/reports/constants";
import {
  DEFAULT_REPORTS_PERIOD,
  isReportsPeriodOption,
  resolveReportsPeriod,
} from "@/lib/reports/period";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpensesTab } from "@/components/reports/expenses-tab";
import { ManualRevenuesTab } from "@/components/reports/manual-revenues-tab";
import { ExpenseFormDialog } from "@/components/reports/expense-form-dialog";
import { ManualRevenueFormDialog } from "@/components/reports/manual-revenue-form-dialog";
import { OverviewTab } from "@/components/reports/overview-tab";
import { TransactionsTab } from "@/components/reports/transactions-tab";

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const { organizationId } = await requireOrgAccess(orgSlug);

  const t = await getTranslations("reports");

  // Filtres de l'onglet "Transactions" (checkpoint 3) — paramètres d'URL non
  // préfixés (`?type=`, `?category=`, `?period=`, etc.), portée indépendante
  // du filtre de période préfixé "overview" de la Vue d'ensemble.
  const rawType = readParam(sp.type);
  const transactionType = rawType && isTransactionType(rawType) ? rawType : undefined;

  const rawCategory = readParam(sp.category);
  const transactionCategory =
    rawCategory && (isRevenueCategory(rawCategory) || isExpenseCategory(rawCategory))
      ? rawCategory
      : undefined;

  const rawPeriod = readParam(sp.period);
  const transactionsPeriodOption =
    rawPeriod && isReportsPeriodOption(rawPeriod) ? rawPeriod : DEFAULT_REPORTS_PERIOD;
  const transactionsPeriod = resolveReportsPeriod(transactionsPeriodOption, {
    from: readParam(sp.from),
    to: readParam(sp.to),
  });

  const rawPage = Number(readParam(sp.page));
  const transactionsPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const [expenses, revenues, transactionsResult] = await Promise.all([
    listExpenses(organizationId),
    listManualRevenues(organizationId),
    listTransactions({
      organizationId,
      period: transactionsPeriod,
      type: transactionType,
      category: transactionCategory,
      search: readParam(sp.search),
      page: transactionsPage,
    }),
  ]);

  // Édition en place : `?editExpense=true&transactionId=X` / `?editRevenue=true&transactionId=X`.
  // Résolue depuis les listes déjà chargées (pas de pagination checkpoint 1,
  // l'élément édité y est toujours présent) plutôt qu'une requête dédiée.
  const editExpenseId =
    sp.editExpense === "true" ? readParam(sp.transactionId) : undefined;
  const editExpense = editExpenseId
    ? expenses.find((expense) => expense.id === editExpenseId)
    : undefined;

  const editRevenueId =
    sp.editRevenue === "true" ? readParam(sp.transactionId) : undefined;
  const editRevenue = editRevenueId
    ? revenues.find((revenue) => revenue.id === editRevenueId)
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="transactions">{t("tabs.transactions")}</TabsTrigger>
          <TabsTrigger value="expenses">{t("tabs.expenses")}</TabsTrigger>
          <TabsTrigger value="manualRevenues">{t("tabs.manualRevenues")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <OverviewTab
            organizationId={organizationId}
            overviewPeriod={readParam(sp.overviewPeriod)}
            overviewFrom={readParam(sp.overviewFrom)}
            overviewTo={readParam(sp.overviewTo)}
          />
        </TabsContent>

        <TabsContent value="transactions" className="pt-4">
          <TransactionsTab orgSlug={orgSlug} result={transactionsResult} />
        </TabsContent>

        <TabsContent value="expenses" className="pt-4">
          <ExpensesTab orgSlug={orgSlug} expenses={expenses} />
        </TabsContent>

        <TabsContent value="manualRevenues" className="pt-4">
          <ManualRevenuesTab orgSlug={orgSlug} revenues={revenues} />
        </TabsContent>
      </Tabs>

      <ExpenseFormDialog orgSlug={orgSlug} />
      {editExpense ? (
        <ExpenseFormDialog orgSlug={orgSlug} expense={editExpense} />
      ) : null}
      <ManualRevenueFormDialog orgSlug={orgSlug} />
      {editRevenue ? (
        <ManualRevenueFormDialog orgSlug={orgSlug} revenue={editRevenue} />
      ) : null}
    </div>
  );
}
