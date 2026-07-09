/**
 * Montants monétaires — GNF uniquement en V1 (schema-design §1.4).
 * Stockage en centimes (bigint/number), jamais de float/decimal. Saisie
 * utilisateur en unités GNF, conversion en centimes avant écriture.
 */

/** Unités GNF (saisie utilisateur) → centimes (stockage). Arrondit au centime. */
export function gnfToCentimes(amountGnf: number): number {
  return Math.round(amountGnf * 100);
}

/** Centimes (stockage) → unités GNF (affichage/saisie). */
export function centimesToGnf(amountCentimes: number): number {
  return amountCentimes / 100;
}

/** Formate un montant en centimes pour l'affichage : "220 000 GNF". */
export function formatCurrency(amountCentimes: number, locale = "fr"): string {
  const gnf = centimesToGnf(amountCentimes);
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(gnf);
  return `${formatted} GNF`;
}
