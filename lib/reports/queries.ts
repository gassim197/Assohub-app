import { and, count, desc, eq, gte, ilike, isNull, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { transactions } from "@/lib/db/transactions-schema";
import { payments } from "@/lib/db/cotisations-schema";
import { user } from "@/lib/db/auth-schema";
import { REPORTS_TRANSACTIONS_PAGE_SIZE } from "./constants";
import type { TransactionType } from "./constants";

export interface ReportsPeriodRange {
  start: string;
  end: string;
}

export type TransactionRow = typeof transactions.$inferSelect;

export interface TransactionWithRecorderRow {
  id: string;
  type: string;
  category: string;
  amount: number;
  occurredAt: string;
  description: string;
  paymentId: string | null;
  referenceDocument: string | null;
  recordedByName: string;
  createdAt: Date;
}

const RECORDER_COLUMNS = {
  id: transactions.id,
  type: transactions.type,
  category: transactions.category,
  amount: transactions.amount,
  occurredAt: transactions.occurredAt,
  description: transactions.description,
  paymentId: transactions.paymentId,
  referenceDocument: transactions.referenceDocument,
  recordedByName: user.name,
  createdAt: transactions.createdAt,
};

/**
 * Dépenses de l'organisation (onglet "Dépenses"), plus récentes d'abord.
 * Toujours des saisies manuelles (`payment_id` n'est jamais rempli pour un
 * type `expense`) — pas de filtre supplémentaire nécessaire pour
 * l'éditabilité, contrairement aux revenus.
 */
export async function listExpenses(
  organizationId: string,
): Promise<TransactionWithRecorderRow[]> {
  return db
    .select(RECORDER_COLUMNS)
    .from(transactions)
    .innerJoin(user, eq(transactions.recordedByUserId, user.id))
    .where(
      and(
        eq(transactions.organizationId, organizationId),
        eq(transactions.type, "expense"),
        isNull(transactions.deletedAt),
      ),
    )
    .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt));
}

/**
 * Revenus manuels de l'organisation (onglet "Autres revenus") : `type =
 * 'revenue'` ET `payment_id IS NULL` — exclut les revenus de cotisations
 * auto-générés, gérés depuis le module Cotisations.
 */
export async function listManualRevenues(
  organizationId: string,
): Promise<TransactionWithRecorderRow[]> {
  return db
    .select(RECORDER_COLUMNS)
    .from(transactions)
    .innerJoin(user, eq(transactions.recordedByUserId, user.id))
    .where(
      and(
        eq(transactions.organizationId, organizationId),
        eq(transactions.type, "revenue"),
        isNull(transactions.paymentId),
        isNull(transactions.deletedAt),
      ),
    )
    .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt));
}

/**
 * Récupère une transaction par son id, bornée à l'organisation et hors
 * supprimées. Un `transactionId` d'une autre organisation renvoie `null`.
 */
export async function getTransactionById(
  organizationId: string,
  transactionId: string,
): Promise<TransactionRow | null> {
  const [row] = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.id, transactionId),
        eq(transactions.organizationId, organizationId),
        isNull(transactions.deletedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}

// ─── Dashboard (checkpoint 2) ─────────────────────────────────────────────────
// Agrégations SQL directes (`db.execute` + `FILTER`/`GROUP BY`) plutôt que du
// calcul en JS sur des lignes chargées : les sommes doivent porter sur TOUTES
// les transactions validées de la période, pas seulement une page. Les
// agrégats Postgres (`SUM`) reviennent en chaîne via le driver (précision
// bigint) — converties en `number` ici, les montants restant largement sous
// `Number.MAX_SAFE_INTEGER` en centimes GNF pour une association.

export interface FinancialKpis {
  totalRevenue: number;
  totalExpense: number;
  netBalance: number;
}

/**
 * KPIs financiers sur une période (schema-design §7.4) : revenus totaux,
 * dépenses totales (transactions `validated`, non supprimées), solde net.
 * Une seule requête à agrégation conditionnelle (`FILTER`) plutôt que deux
 * requêtes séparées. Multi-tenant strict.
 */
export async function getFinancialKpis(
  organizationId: string,
  period: ReportsPeriodRange,
): Promise<FinancialKpis> {
  const result = await db.execute(sql`
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE type = 'revenue'), 0) AS total_revenue,
      COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS total_expense
    FROM transactions
    WHERE organization_id = ${organizationId}
      AND status = 'validated'
      AND deleted_at IS NULL
      AND occurred_at BETWEEN ${period.start} AND ${period.end}
  `);

  const row = result.rows[0] as
    | { total_revenue: string; total_expense: string }
    | undefined;
  const totalRevenue = Number(row?.total_revenue ?? 0);
  const totalExpense = Number(row?.total_expense ?? 0);

  return { totalRevenue, totalExpense, netBalance: totalRevenue - totalExpense };
}

export interface MonthlyBreakdownRow {
  /** "YYYY-MM" */
  month: string;
  revenue: number;
  expense: number;
}

/**
 * Évolution mensuelle (schema-design §7.4) : `GROUP BY DATE_TRUNC('month',
 * occurred_at)`, revenus et dépenses sur la même ligne pour alimenter
 * directement un graphique en barres groupées. Multi-tenant strict.
 */
export async function getMonthlyBreakdown(
  organizationId: string,
  period: ReportsPeriodRange,
): Promise<MonthlyBreakdownRow[]> {
  const result = await db.execute(sql`
    SELECT
      TO_CHAR(DATE_TRUNC('month', occurred_at), 'YYYY-MM') AS month,
      COALESCE(SUM(amount) FILTER (WHERE type = 'revenue'), 0) AS revenue,
      COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expense
    FROM transactions
    WHERE organization_id = ${organizationId}
      AND status = 'validated'
      AND deleted_at IS NULL
      AND occurred_at BETWEEN ${period.start} AND ${period.end}
    GROUP BY DATE_TRUNC('month', occurred_at)
    ORDER BY DATE_TRUNC('month', occurred_at)
  `);

  return result.rows.map((row) => {
    const r = row as { month: string; revenue: string; expense: string };
    return { month: r.month, revenue: Number(r.revenue), expense: Number(r.expense) };
  });
}

export interface CategoryBreakdownRow {
  category: string;
  amount: number;
}

/**
 * Répartition par catégorie (schema-design §7.4) : `GROUP BY category`
 * filtré par `type`, triée par montant décroissant. Le pourcentage se
 * calcule à l'affichage (dépend du total, déjà connu par l'appelant via
 * `getFinancialKpis`). Multi-tenant strict.
 */
export async function getCategoryBreakdown(
  organizationId: string,
  period: ReportsPeriodRange,
  type: "revenue" | "expense",
): Promise<CategoryBreakdownRow[]> {
  const result = await db.execute(sql`
    SELECT category, SUM(amount) AS amount
    FROM transactions
    WHERE organization_id = ${organizationId}
      AND type = ${type}
      AND status = 'validated'
      AND deleted_at IS NULL
      AND occurred_at BETWEEN ${period.start} AND ${period.end}
    GROUP BY category
    ORDER BY amount DESC
  `);

  return result.rows.map((row) => {
    const r = row as { category: string; amount: string };
    return { category: r.category, amount: Number(r.amount) };
  });
}

// ─── Onglet "Transactions" (checkpoint 3) ─────────────────────────────────────

export interface TransactionListRow {
  id: string;
  type: string;
  category: string;
  amount: number;
  occurredAt: string;
  description: string;
  paymentId: string | null;
  /** Id de la cotisation liée, via `payments.cotisationId` — pour le lien "Voir le paiement". */
  cotisationId: string | null;
  referenceDocument: string | null;
  recordedByName: string;
}

export interface ListTransactionsParams {
  organizationId: string;
  period: ReportsPeriodRange;
  type?: TransactionType;
  category?: string;
  search?: string;
  page?: number;
}

export interface ListTransactionsResult {
  rows: TransactionListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Liste paginée de toutes les transactions (revenus ET dépenses) de
 * l'organisation, filtrable par type/catégorie/recherche/période
 * (checkpoint 3). `payments` est jointe en `left join` pour exposer
 * `cotisationId` — seules les lignes `payment_id IS NOT NULL` en ont un,
 * utilisé pour le lien "Voir le paiement" vers le module Cotisations. Même
 * filtre `status = 'validated'` que les agrégats de la vue d'ensemble
 * (schema-design §7.4). Multi-tenant strict.
 */
export async function listTransactions({
  organizationId,
  period,
  type,
  category,
  search,
  page = 1,
}: ListTransactionsParams): Promise<ListTransactionsResult> {
  const conditions = [
    eq(transactions.organizationId, organizationId),
    eq(transactions.status, "validated"),
    isNull(transactions.deletedAt),
    gte(transactions.occurredAt, period.start),
    lte(transactions.occurredAt, period.end),
  ];

  if (type) {
    conditions.push(eq(transactions.type, type));
  }
  if (category) {
    conditions.push(eq(transactions.category, category));
  }
  const term = search?.trim();
  if (term) {
    conditions.push(ilike(transactions.description, `%${term}%`));
  }

  const where = and(...conditions);
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * REPORTS_TRANSACTIONS_PAGE_SIZE;

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: transactions.id,
        type: transactions.type,
        category: transactions.category,
        amount: transactions.amount,
        occurredAt: transactions.occurredAt,
        description: transactions.description,
        paymentId: transactions.paymentId,
        cotisationId: payments.cotisationId,
        referenceDocument: transactions.referenceDocument,
        recordedByName: user.name,
      })
      .from(transactions)
      .innerJoin(user, eq(transactions.recordedByUserId, user.id))
      .leftJoin(payments, eq(transactions.paymentId, payments.id))
      .where(where)
      .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt))
      .limit(REPORTS_TRANSACTIONS_PAGE_SIZE)
      .offset(offset),
    db.select({ value: count() }).from(transactions).where(where),
  ]);

  const total = Number(totalResult[0]?.value ?? 0);

  return {
    rows: rows.map((row) => ({ ...row, cotisationId: row.cotisationId ?? null })),
    total,
    page: safePage,
    pageSize: REPORTS_TRANSACTIONS_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / REPORTS_TRANSACTIONS_PAGE_SIZE)),
  };
}

/**
 * Toutes les transactions de la période, sans pagination — pour le tableau
 * du rapport PDF (checkpoint 4), qui doit couvrir la période entière plutôt
 * qu'une seule page. Même filtre `status = 'validated'` que les autres
 * agrégats. Multi-tenant strict.
 */
export async function listAllTransactionsForPeriod(
  organizationId: string,
  period: ReportsPeriodRange,
): Promise<TransactionWithRecorderRow[]> {
  return db
    .select(RECORDER_COLUMNS)
    .from(transactions)
    .innerJoin(user, eq(transactions.recordedByUserId, user.id))
    .where(
      and(
        eq(transactions.organizationId, organizationId),
        eq(transactions.status, "validated"),
        isNull(transactions.deletedAt),
        gte(transactions.occurredAt, period.start),
        lte(transactions.occurredAt, period.end),
      ),
    )
    .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt));
}
