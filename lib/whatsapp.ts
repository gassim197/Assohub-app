/**
 * Construit un lien `wa.me` ciblant un numéro précis (contrairement au
 * partage générique `wa.me/?text=...` des invitations) — utilisé pour
 * contacter un membre sans email lors d'une relance de cotisation (5C §3, §4).
 * `phoneE164` est stocké au format `+224...` ; wa.me attend les chiffres seuls.
 */
export function buildWhatsAppUrl(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
