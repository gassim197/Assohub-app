/**
 * URL publique de l'application, utilisée pour construire les liens envoyés
 * par email ou WhatsApp (invitations, liens partageables). Réutilise la même
 * variable d'env que le client Better-Auth (`lib/auth/client.ts`) plutôt que
 * d'en introduire une nouvelle : les deux désignent le même domaine.
 */
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000";
}
