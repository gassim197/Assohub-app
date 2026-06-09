import {
  isValidPhoneNumber,
  parsePhoneNumberWithError,
} from "libphonenumber-js";

// V1 : organisations basées en Guinée. Pays par défaut pour les numéros saisis
// sans indicatif international. À rendre configurable par organisation en V1.1+.
export const DEFAULT_PHONE_COUNTRY = "GN" as const;

/**
 * Valide un numéro de téléphone (format national guinéen ou international E.164).
 * Utilisé dans le schéma Zod partagé client/serveur.
 */
export function isValidPhone(value: string): boolean {
  if (!value?.trim()) return false;
  try {
    return isValidPhoneNumber(value, DEFAULT_PHONE_COUNTRY);
  } catch {
    return false;
  }
}

/**
 * Normalise un numéro saisi en E.164 (`+224...`) pour le stockage.
 * Retourne `null` si le numéro est invalide.
 */
export function toE164(value: string): string | null {
  try {
    return parsePhoneNumberWithError(value, DEFAULT_PHONE_COUNTRY).number;
  } catch {
    return null;
  }
}

/**
 * Formate un numéro stocké (E.164) pour l'affichage : `+224 611 55 15 20`.
 * Retombe sur la valeur brute si le parsing échoue.
 */
export function formatPhone(value: string): string {
  try {
    return parsePhoneNumberWithError(value).formatInternational();
  } catch {
    return value;
  }
}
