"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { requireOrgAccess } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { transactions } from "@/lib/db/transactions-schema";
import { gnfToCentimes } from "@/lib/currency";
import { getTransactionById } from "./queries";
import { expenseServerSchema, manualRevenueServerSchema } from "./schema";

export type TransactionActionResult =
  | { ok: true; transactionId: string }
  | { ok: false; error: "validation" | "notFound" | "linkedToPayment" | "unknown" };

/**
 * Crée une dépense (checkpoint 1). Toujours `status = 'validated'` — pas de
 * workflow de validation en V1 (schema-design §7.1, baked pour V1.1+).
 * `payment_id` reste `null` par construction : jamais lu depuis `raw`, donc
 * pas de risque qu'un client en forge un.
 */
export async function createExpense(
  orgSlug: string,
  raw: unknown,
): Promise<TransactionActionResult> {
  const { organizationId, userId } = await requireOrgAccess(orgSlug);

  const parsed = expenseServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  const transactionId = newId();
  try {
    await db.insert(transactions).values({
      id: transactionId,
      organizationId,
      recordedByUserId: userId,
      type: "expense",
      category: data.category,
      amount: gnfToCentimes(data.amount),
      occurredAt: data.occurredAt,
      description: data.description,
      referenceDocument: data.referenceDocument ?? null,
    });
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/reports`);
  return { ok: true, transactionId };
}

/**
 * Met à jour une dépense existante. Garde : refuse si la transaction est liée
 * à un paiement de cotisation (`payment_id` non nul) — ne devrait jamais
 * arriver pour un `type = 'expense'`, mais vérifié par défense en profondeur
 * plutôt que de faire confiance à l'appelant.
 */
export async function updateExpense(
  orgSlug: string,
  transactionId: string,
  raw: unknown,
): Promise<TransactionActionResult> {
  const { organizationId } = await requireOrgAccess(orgSlug);

  const parsed = expenseServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  const existing = await getTransactionById(organizationId, transactionId);
  if (!existing) {
    return { ok: false, error: "notFound" };
  }
  if (existing.paymentId) {
    return { ok: false, error: "linkedToPayment" };
  }

  try {
    await db
      .update(transactions)
      .set({
        category: data.category,
        amount: gnfToCentimes(data.amount),
        occurredAt: data.occurredAt,
        description: data.description,
        referenceDocument: data.referenceDocument ?? null,
      })
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.organizationId, organizationId),
          isNull(transactions.deletedAt),
        ),
      );
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/reports`);
  return { ok: true, transactionId };
}

/**
 * Crée un revenu manuel (checkpoint 1, onglet "Autres revenus") :
 * `payment_id = null` par construction — ce n'est pas un paiement de
 * cotisation. La catégorie est bornée à `MANUAL_REVENUE_CATEGORIES`
 * (`cotisations` exclu) par le schéma Zod.
 */
export async function createManualRevenue(
  orgSlug: string,
  raw: unknown,
): Promise<TransactionActionResult> {
  const { organizationId, userId } = await requireOrgAccess(orgSlug);

  const parsed = manualRevenueServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  const transactionId = newId();
  try {
    await db.insert(transactions).values({
      id: transactionId,
      organizationId,
      recordedByUserId: userId,
      type: "revenue",
      category: data.category,
      amount: gnfToCentimes(data.amount),
      occurredAt: data.occurredAt,
      description: data.description,
      referenceDocument: data.referenceDocument ?? null,
    });
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/reports`);
  return { ok: true, transactionId };
}

/**
 * Met à jour un revenu manuel existant. Même garde que `updateExpense` :
 * refuse si `payment_id` est renseigné (revenu de cotisation, géré depuis le
 * module Cotisations, jamais depuis Rapports).
 */
export async function updateManualRevenue(
  orgSlug: string,
  transactionId: string,
  raw: unknown,
): Promise<TransactionActionResult> {
  const { organizationId } = await requireOrgAccess(orgSlug);

  const parsed = manualRevenueServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  const existing = await getTransactionById(organizationId, transactionId);
  if (!existing) {
    return { ok: false, error: "notFound" };
  }
  if (existing.paymentId) {
    return { ok: false, error: "linkedToPayment" };
  }

  try {
    await db
      .update(transactions)
      .set({
        category: data.category,
        amount: gnfToCentimes(data.amount),
        occurredAt: data.occurredAt,
        description: data.description,
        referenceDocument: data.referenceDocument ?? null,
      })
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.organizationId, organizationId),
          isNull(transactions.deletedAt),
        ),
      );
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/reports`);
  return { ok: true, transactionId };
}

/**
 * Supprime (soft delete) une transaction manuelle — dépense ou revenu
 * manuel. Refuse si elle est liée à un paiement de cotisation (`payment_id`
 * non nul) : ces lignes ne se suppriment que depuis le module Cotisations
 * (`softDeletePayment`), jamais depuis Rapports.
 */
export async function softDeleteTransaction(
  orgSlug: string,
  transactionId: string,
): Promise<TransactionActionResult> {
  const { organizationId } = await requireOrgAccess(orgSlug);

  const existing = await getTransactionById(organizationId, transactionId);
  if (!existing) {
    return { ok: false, error: "notFound" };
  }
  if (existing.paymentId) {
    return { ok: false, error: "linkedToPayment" };
  }

  try {
    await db
      .update(transactions)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.organizationId, organizationId),
          isNull(transactions.deletedAt),
        ),
      );
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/reports`);
  return { ok: true, transactionId };
}
