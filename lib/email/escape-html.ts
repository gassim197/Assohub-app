/**
 * Échappe une valeur avant injection dans du HTML d'email. Les valeurs
 * interpolées (noms, messages libres...) viennent de saisies utilisateur —
 * on échappe systématiquement pour éviter toute casse de structure ou
 * injection de balises. Partagé entre tous les templates de `lib/email/`.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
