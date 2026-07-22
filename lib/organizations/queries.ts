import { and, asc, eq, ne } from "drizzle-orm";

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

export interface SoleOwnedOrganization {
  id: string;
  name: string;
}

/**
 * Organisations dont `userId` est le seul `owner` (chantier "zone de
 * danger" — un utilisateur ne peut pas supprimer son compte tant qu'il en
 * reste le seul responsable, pas de transfert de propriété en V1). Seul le
 * rôle Better-Auth `owner` compte (`admin` n'est pas considéré "responsable"
 * ici), posé automatiquement sur le créateur d'une organisation.
 */
export async function getUserSoleOwnedOrganizations(
  userId: string,
): Promise<SoleOwnedOrganization[]> {
  const ownedOrgs = await db
    .select({ id: organization.id, name: organization.name })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(and(eq(member.userId, userId), eq(member.role, "owner")));

  if (ownedOrgs.length === 0) return [];

  const soleOwned: SoleOwnedOrganization[] = [];
  for (const org of ownedOrgs) {
    const [otherOwner] = await db
      .select({ id: member.id })
      .from(member)
      .where(
        and(
          eq(member.organizationId, org.id),
          eq(member.role, "owner"),
          ne(member.userId, userId),
        ),
      )
      .limit(1);
    if (!otherOwner) soleOwned.push(org);
  }
  return soleOwned;
}
