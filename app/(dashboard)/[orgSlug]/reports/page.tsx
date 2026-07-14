import { getTranslations } from "next-intl/server";

import { requireOrgAccess } from "@/lib/auth/org";
import { listExpenses, listManualRevenues } from "@/lib/reports/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpensesTab } from "@/components/reports/expenses-tab";
import { ManualRevenuesTab } from "@/components/reports/manual-revenues-tab";
import { ExpenseFormDialog } from "@/components/reports/expense-form-dialog";
import { ManualRevenueFormDialog } from "@/components/reports/manual-revenue-form-dialog";

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

  const [expenses, revenues] = await Promise.all([
    listExpenses(organizationId),
    listManualRevenues(organizationId),
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
          <p className="text-sm text-muted-foreground">{t("comingSoon")}</p>
        </TabsContent>

        <TabsContent value="transactions" className="pt-4">
          <p className="text-sm text-muted-foreground">{t("comingSoon")}</p>
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
