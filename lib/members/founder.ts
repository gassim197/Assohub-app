import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { associationMembers } from "@/lib/db/members-schema";

/**
 * Auto-création du fondateur (schema-design §3.1 / §10.3).
 *
 * Insère le créateur d'une organisation dans l'annuaire métier
 * `association_members` avec `role = 'administrateur'` et `status = 'actif'`.
 *
 * Idempotent : si une ligne non supprimée existe déjà pour ce couple
 * (organization_id, user_id), on ne fait rien. C'est ce qui rend l'opération
 * rejouable — par le hook `afterCreateOrganization` ET par le script de backfill
 * — sans jamais créer de doublon ni toucher une ligne existante (soft delete
 * préservé).
 *
 * `phone_number` est posé à chaîne vide : le compte Better-Auth ne porte pas de
 * téléphone, le fondateur complétera son profil depuis le CRUD Membres.
 *
 * @returns "created" si une ligne a été insérée, "skipped" si elle existait déjà.
 */
export async function ensureFounderMember(params: {
  organizationId: string;
  user: { id: string; name: string | null; email: string | null };
}): Promise<"created" | "skipped"> {
  const { organizationId, user } = params;

  const [existing] = await db
    .select({ id: associationMembers.id })
    .from(associationMembers)
    .where(
      and(
        eq(associationMembers.organizationId, organizationId),
        eq(associationMembers.userId, user.id),
        isNull(associationMembers.deletedAt),
      ),
    )
    .limit(1);

  if (existing) {
    return "skipped";
  }

  await db.insert(associationMembers).values({
    id: newId(),
    organizationId,
    userId: user.id,
    fullName: user.name ?? user.email ?? "Fondateur",
    phoneNumber: "", // à compléter par le fondateur (le compte n'a pas de téléphone)
    email: user.email,
    role: "administrateur",
    status: "actif",
  });

  return "created";
}
