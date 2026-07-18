import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { member, organization } from "@/lib/db/schema";

export interface UserOrganizationRow {
  id: string;
  name: string;
  slug: string;
  /** Rôle Better-Auth (owner/admin/member) — distinct du rôle métier `association_members.role`. */
  role: string;
}

/**
 * Organisations dont un utilisateur est membre (switcher d'organisations,
 * session 8B), via la table `member` de Better-Auth. Structurellement
 * multi-tenant : ne peut jamais renvoyer une organisation dont `userId`
 * n'est pas membre, puisque c'est la table de jointure elle-même qui borne
 * le résultat.
 */
export async function getUserOrganizations(userId: string): Promise<UserOrganizationRow[]> {
  return db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: member.role,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .orderBy(asc(organization.name));
}
