import type { badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import { centimesToGnf } from "@/lib/currency";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

// ─── Type de transaction (schema-design §7.1) ────────────────────────────────

export const TRANSACTION_TYPES = ["revenue", "expense"] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export function isTransactionType(value: string): value is TransactionType {
  return (TRANSACTION_TYPES as readonly string[]).includes(value);
}

export const TRANSACTION_TYPE_BADGE_VARIANT: Record<TransactionType, BadgeVariant> = {
  revenue: "success",
  expense: "destructive",
};

// ─── Catégories de revenus (schema-design §7.2, 7 valeurs) ───────────────────
// `cotisations` est réservé à la génération automatique depuis `payments` —
// jamais proposé dans le formulaire de saisie manuelle (onglet "Autres revenus").

export const REVENUE_CATEGORIES = [
  "cotisations",
  "dons",
  "subventions",
  "recettes_evenements",
  "ventes",
  "partenariats",
  "autre_revenu",
] as const;

export type RevenueCategory = (typeof REVENUE_CATEGORIES)[number];

export function isRevenueCategory(value: string): value is RevenueCategory {
  return (REVENUE_CATEGORIES as readonly string[]).includes(value);
}

/** Catégories proposées à la saisie manuelle — `cotisations` exclu. */
export const MANUAL_REVENUE_CATEGORIES = [
  "dons",
  "subventions",
  "recettes_evenements",
  "ventes",
  "partenariats",
  "autre_revenu",
] as const;

export type ManualRevenueCategory = (typeof MANUAL_REVENUE_CATEGORIES)[number];

export const DEFAULT_MANUAL_REVENUE_CATEGORY: ManualRevenueCategory = "dons";

// ─── Catégories de dépenses (schema-design §7.3, 10 valeurs) ─────────────────

export const EXPENSE_CATEGORIES = [
  "loyer_charges",
  "fournitures",
  "communication",
  "evenements",
  "transport",
  "personnel",
  "frais_bancaires",
  "dons_verses",
  "impots_taxes",
  "autre_depense",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const DEFAULT_EXPENSE_CATEGORY: ExpenseCategory = "autre_depense";

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

// ─── Bornes de montant (même patron que `lib/cotisations/payment-constants.ts`) ─
// Plafond plus large que les cotisations : une subvention ou un don peut
// dépasser le plafond d'un paiement de cotisation individuel.

export const MIN_TRANSACTION_AMOUNT_CENTIMES = 100; // 1 GNF
export const MAX_TRANSACTION_AMOUNT_CENTIMES = 100_000_000_000; // 1 000 000 000 GNF

export const MIN_TRANSACTION_AMOUNT_GNF = centimesToGnf(MIN_TRANSACTION_AMOUNT_CENTIMES);
export const MAX_TRANSACTION_AMOUNT_GNF = centimesToGnf(MAX_TRANSACTION_AMOUNT_CENTIMES);
