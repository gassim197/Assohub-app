import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

/**
 * Recalcule `paid_amount` et `status` d'une cotisation à partir de la vraie
 * somme de ses paiements non supprimés — jamais par incrément JS (session 5B
 * §1). Un seul `UPDATE ... FROM (SELECT SUM...)` : la somme est calculée une
 * fois par Postgres, au moment de l'écriture, dans la même transaction que le
 * reste du batch (les requêtes d'un `db.batch()` s'exécutent séquentiellement
 * et voient les écritures précédentes du même batch).
 *
 * Source de vérité canonique de `status` — réplique exacte en TypeScript pur
 * dans `computeCotisationStatus` (lib/cotisations/status.ts), réservée aux
 * prévisualisations UI. Toute modification ici doit y être répercutée.
 *
 * Réutilisé par `recordPayment`, `updatePayment` et `softDeletePayment` (5B
 * checkpoints 1 et 2) : mêmes trois écritures dans le même `db.batch()`.
 *
 * Isolée hors de `payment-actions.ts` ("use server") : Next.js exige que
 * toute fonction exportée d'un module "use server" soit elle-même une Server
 * Action async — ce helper synchrone (retourne une requête `PgRaw` à intégrer
 * dans un `db.batch()`, pas un appel direct côté client) ne peut pas y vivre.
 */
export function recalculateCotisationStatement(
  cotisationId: string,
  organizationId: string,
) {
  return db.execute(sql`
    UPDATE cotisations c
    SET paid_amount = t.total,
        status = CASE
          WHEN t.total >= c.due_amount THEN 'paye'
          WHEN t.total > 0 THEN 'partiel'
          WHEN c.due_date < CURRENT_DATE THEN 'en_retard'
          ELSE 'en_attente'
        END
    FROM (
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM payments
      WHERE cotisation_id = ${cotisationId} AND deleted_at IS NULL
    ) t
    WHERE c.id = ${cotisationId} AND c.organization_id = ${organizationId}
  `);
}
