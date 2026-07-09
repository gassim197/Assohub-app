import type { CotisationStatus } from "./constants";

export interface CotisationStatusInput {
  dueAmount: number;
  paidAmount: number;
  /** `YYYY-MM-DD` */
  dueDate: string;
  /** `YYYY-MM-DD`, défaut : aujourd'hui (UTC = Africa/Conakry, GMT+0 sans DST). */
  today?: string;
}

/**
 * Calcule le statut d'une cotisation (schema-design §5.2, session 5B §A).
 *
 * Source de vérité canonique : le `CASE` SQL de
 * `recalculateCotisationStatement` (lib/cotisations/payment-actions.ts), qui
 * effectue le même calcul directement en base au moment de l'écriture — c'est
 * lui qui fait foi pour `cotisations.status`. Cette fonction pure est une
 * réplique exacte, réservée aux prévisualisations côté UI (confirmation de
 * suppression, aperçu dans la modal d'encaissement) : elle ne doit JAMAIS
 * servir à écrire `status` en base. Toute modification de l'une des deux
 * implémentations doit être répercutée sur l'autre.
 *
 * Priorité (décision 5B, validée) : un paiement partiel prime sur le retard —
 * `partiel` peu importe `due_date`. La cotisation "due" (paid_amount = 0) se
 * répartit ensuite entre `en_attente` et `en_retard` selon la date.
 */
export function computeCotisationStatus({
  dueAmount,
  paidAmount,
  dueDate,
  today,
}: CotisationStatusInput): CotisationStatus {
  if (paidAmount >= dueAmount) return "paye";
  if (paidAmount > 0) return "partiel";
  const todayStr = today ?? new Date().toISOString().slice(0, 10);
  return dueDate < todayStr ? "en_retard" : "en_attente";
}

/**
 * Un `partiel` dont l'échéance est dépassée reste logiquement `partiel`
 * (décision 5B, point A) mais doit rester visuellement signalé — un président
 * ne doit pas manquer un partiel qui traîne. Utilisé par l'UI uniquement.
 */
export function isOverduePartial({
  status,
  dueDate,
  today,
}: {
  status: string;
  dueDate: string;
  today?: string;
}): boolean {
  const todayStr = today ?? new Date().toISOString().slice(0, 10);
  return status === "partiel" && dueDate < todayStr;
}
