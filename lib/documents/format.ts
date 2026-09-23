/**
 * Taille de fichier affichée en Mo, toujours — quota et fichiers individuels
 * restent dans la même unité (10 Mo max par fichier, 200 Mo par organisation),
 * pas de bascule Ko/Mo qui compliquerait la lecture sans bénéfice réel ici.
 * Le suffixe ("Mo"/"MB") est localisé via next-intl (`documents.sizeInMb`),
 * pas ici — ce module ne renvoie qu'un nombre déjà arrondi.
 */
export function bytesToMb(bytes: number): number {
  return bytes / (1024 * 1024);
}

export function formatSizeMbValue(bytes: number, locale = "fr"): string {
  const mb = bytesToMb(bytes);
  const decimals = mb < 10 ? 1 : 0;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(mb);
}
