import { z } from "zod";

import {
  EXPENSE_CATEGORIES,
  MANUAL_REVENUE_CATEGORIES,
  MAX_TRANSACTION_AMOUNT_GNF,
  MIN_TRANSACTION_AMOUNT_GNF,
} from "./constants";
import { todayISO } from "./period";

/**
 * Messages d'erreur de validation, injectés depuis l'appelant (même patron
 * que `lib/cotisations/payment-schema.ts`). Partagé par les dépenses et les
 * revenus manuels — mêmes règles de validation, seule la liste de
 * catégories diffère.
 */
export interface TransactionFormMessages {
  amountInteger: string;
  amountMin: string;
  amountMax: string;
  descriptionRequired: string;
  dateInvalid: string;
  dateNotFuture: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function baseTransactionShape(m: TransactionFormMessages) {
  const emptyToUndef = (v: unknown) =>
    typeof v === "string" && v.trim() === "" ? undefined : v;

  return {
    amount: z.coerce
      .number()
      .int(m.amountInteger)
      .min(MIN_TRANSACTION_AMOUNT_GNF, m.amountMin)
      .max(MAX_TRANSACTION_AMOUNT_GNF, m.amountMax),

    description: z.string().trim().min(1, m.descriptionRequired).max(500),

    occurredAt: z
      .string()
      .regex(DATE_RE, m.dateInvalid)
      .refine((v) => v <= todayISO(), m.dateNotFuture),

    referenceDocument: z.preprocess(
      emptyToUndef,
      z.string().trim().max(200).optional(),
    ),
  };
}

/** Schéma de création/édition d'une dépense (onglet "Dépenses"). */
export function buildExpenseSchema(m: TransactionFormMessages) {
  return z.object({
    ...baseTransactionShape(m),
    category: z.enum(EXPENSE_CATEGORIES),
  });
}

/** Schéma de création/édition d'un revenu manuel (onglet "Autres revenus"). */
export function buildManualRevenueSchema(m: TransactionFormMessages) {
  return z.object({
    ...baseTransactionShape(m),
    category: z.enum(MANUAL_REVENUE_CATEGORIES),
  });
}

// Codes bruts pour la validation serveur (garde-fou). Les messages lisibles
// sont rendus côté client via next-intl.
const RAW_MESSAGES: TransactionFormMessages = {
  amountInteger: "amountInteger",
  amountMin: "amountMin",
  amountMax: "amountMax",
  descriptionRequired: "descriptionRequired",
  dateInvalid: "dateInvalid",
  dateNotFuture: "dateNotFuture",
};

export const expenseServerSchema = buildExpenseSchema(RAW_MESSAGES);
export type ExpenseFormValues = z.output<typeof expenseServerSchema>;

export const manualRevenueServerSchema = buildManualRevenueSchema(RAW_MESSAGES);
export type ManualRevenueFormValues = z.output<typeof manualRevenueServerSchema>;
