import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { associationMembers } from "@/lib/db/members-schema";
import { getMemberRole } from "@/lib/organizations/queries";

/**
 * Autorisation d'upload/renommage/suppression de document (checkpoint validé
 * avec le fondateur) : le rôle Better-Auth `owner`, OU le rôle métier de
 * l'annuaire `association_members.role === 'administrateur'`.
 *
 * Le rôle Better-Auth `admin` n'est en pratique jamais attribué dans cette
 * application (aucun flux n'appelle `auth.api.updateMemberRole` — tous les
 * membres invités reçoivent `member`, seul le créateur de l'org reçoit
 * `owner`), donc il n'est délibérément pas testé ici : ce serait une
 * condition morte qui donnerait une fausse impression de couverture.
 *
 * Tout membre qui consulte et télécharge n'a besoin d'aucune vérification de
 * rôle — c'est ouvert à tous les membres de l'organisation (déjà garanti par
 * `requireOrgAccess`).
 */
export async function canManageDocuments(
  organizationId: string,
  userId: string,
): Promise<boolean> {
  const authRole = await getMemberRole(organizationId, userId);
  if (authRole === "owner") return true;

  const [row] = await db
    .select({ role: associationMembers.role })
    .from(associationMembers)
    .where(
      and(
        eq(associationMembers.organizationId, organizationId),
        eq(associationMembers.userId, userId),
        isNull(associationMembers.deletedAt),
      ),
    )
    .limit(1);

  return row?.role === "administrateur";
}
