import { formatCurrency } from "@/lib/currency";

// U+202F (narrow no-break space) et U+00A0 (no-break space) : séparateurs que
// `Intl.NumberFormat` insère (ex. groupement des milliers en `fr`), absents
// de l'encodage WinAnsi des polices de base (Helvetica) de
// `@react-pdf/renderer` — sans ce remplacement ils s'affichent comme "/" dans
// le PDF.
const NON_STANDARD_SPACES_RE = /[  ]/g;

/** `formatCurrency`, avec les espaces non supportées par Helvetica normalisées. */
export function formatCurrencyPdf(amountCentimes: number, locale = "fr"): string {
  return formatCurrency(amountCentimes, locale).replace(NON_STANDARD_SPACES_RE, " ");
}
