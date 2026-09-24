/**
 * Taille de fichier affichée en Ko sous 1 Mo, en Mo au-delà : en Mo seul, un
 * reçu de 45 Ko s'affichait « 0,0 Mo ». Le suffixe (« Ko »/« Mo », « KB »/
 * « MB ») est localisé via next-intl (`documents.size.kb` / `documents.size.mb`),
 * pas ici — ce module ne renvoie qu'un nombre déjà arrondi et son unité.
 */
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1024 * 1024;

export type SizeUnit = "kb" | "mb";

function bytesToMb(bytes: number): number {
  return bytes / BYTES_PER_MB;
}

function formatSizeMbValue(bytes: number, locale = "fr"): string {
  const mb = bytesToMb(bytes);
  const decimals = mb < 10 ? 1 : 0;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(mb);
}

/**
 * Valeur et unité adaptées à la taille. Sous 1 Mo : Ko entiers, arrondis au
 * supérieur (un fichier non vide n'affiche jamais « 0 Ko »). Zéro octet reste
 * en Mo (« 0 Mo », jauge de quota vide).
 */
export function formatSize(bytes: number, locale = "fr"): { value: string; unit: SizeUnit } {
  if (bytes === 0) return { value: "0", unit: "mb" };
  if (bytes < BYTES_PER_MB) {
    const kb = Math.max(1, Math.ceil(bytes / BYTES_PER_KB));
    // 1023,x Ko arrondis au supérieur donneraient « 1 024 Ko » : afficher 1 Mo.
    if (kb >= 1024) return { value: formatSizeMbValue(BYTES_PER_MB, locale), unit: "mb" };
    return { value: new Intl.NumberFormat(locale).format(kb), unit: "kb" };
  }
  return { value: formatSizeMbValue(bytes, locale), unit: "mb" };
}
