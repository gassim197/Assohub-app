import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { transactions } from "@/lib/db/transactions-schema";
import { user } from "@/lib/db/auth-schema";

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
