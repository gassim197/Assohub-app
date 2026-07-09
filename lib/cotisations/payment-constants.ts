import { centimesToGnf } from "@/lib/currency";

// ─── Méthode de paiement (schema-design §5.4, 9 valeurs) ─────────────────────
// Valeurs ASCII stockées telles quelles en base et réutilisées comme clés i18n
// (pas besoin de mapping comme pour les statuts membres accentués).

export const PAYMENT_METHODS = [
  "especes",
  "orange_money",
  "wave",
  "mtn_momo",
  "paycard",
  "soutra_money",
  "virement_bancaire",
  "cheque",
  "autre",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = "especes";

/** Méthodes mobile money : référence de transaction obligatoire (schema-design §5.4). */
export const DIGITAL_PAYMENT_METHODS: readonly PaymentMethod[] = [
  "orange_money",
  "wave",
  "mtn_momo",
  "paycard",
  "soutra_money",
];

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function requiresPaymentReference(method: PaymentMethod): boolean {
  return (DIGITAL_PAYMENT_METHODS as readonly string[]).includes(method);
}

// ─── Bornes de montant (session 5B §2) ────────────────────────────────────────

export const MIN_PAYMENT_AMOUNT_CENTIMES = 100; // 1 GNF
export const MAX_PAYMENT_AMOUNT_CENTIMES = 10_000_000_000; // 100 000 000 GNF

export const MIN_PAYMENT_AMOUNT_GNF = centimesToGnf(MIN_PAYMENT_AMOUNT_CENTIMES);
export const MAX_PAYMENT_AMOUNT_GNF = centimesToGnf(MAX_PAYMENT_AMOUNT_CENTIMES);
