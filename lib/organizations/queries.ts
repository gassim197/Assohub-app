import { and, asc, count, eq, isNull, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  associationMembers,
  cotisations,
  meetings,
  member,
  organization,
  payments,
} from "@/lib/db/schema";

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
  slug: string;
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
    .select({ id: organization.id, name: organization.name, slug: organization.slug })
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

/** Rôle Better-Auth (owner/admin/member) d'un utilisateur dans une organisation, ou `null` s'il n'en est pas membre. */
export async function getMemberRole(
  organizationId: string,
  userId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
    .limit(1);

  return row?.role ?? null;
}

export interface OrganizationDeletionStats {
  /** Annuaire métier (`association_members`), lignes actives (non soft-deleted). */
  memberCount: number;
  cotisationCount: number;
  paymentCount: number;
  meetingCount: number;
  /**
   * Comptes ayant accès à la plateforme (`member`, Better-Auth) autres que le
   * propriétaire — distinct de `memberCount` (l'annuaire métier). C'est ce
   * nombre qui compte pour "X autres membres perdront l'accès".
   */
  otherUserCount: number;
}

/**
 * Chiffres réels affichés dans la confirmation de suppression d'organisation
 * (chantier "suppression d'organisation") — pour que le propriétaire mesure
 * la portée avant de confirmer. Compte les lignes actives (non
 * soft-deleted) : cohérent avec ce que l'organisation "contient"
 * aujourd'hui, plutôt que d'inclure des lignes déjà archivées.
 */
export async function getOrganizationDeletionStats(
  organizationId: string,
  ownerUserId: string,
): Promise<OrganizationDeletionStats> {
  const [
    [memberRow],
    [cotisationRow],
    [paymentRow],
    [meetingRow],
    [otherUserRow],
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(associationMembers)
      .where(
        and(eq(associationMembers.organizationId, organizationId), isNull(associationMembers.deletedAt)),
      ),
    db
      .select({ value: count() })
      .from(cotisations)
      .where(and(eq(cotisations.organizationId, organizationId), isNull(cotisations.deletedAt))),
    db
      .select({ value: count() })
      .from(payments)
      .where(and(eq(payments.organizationId, organizationId), isNull(payments.deletedAt))),
    db
      .select({ value: count() })
      .from(meetings)
      .where(and(eq(meetings.organizationId, organizationId), isNull(meetings.deletedAt))),
    db
      .select({ value: count() })
      .from(member)
      .where(and(eq(member.organizationId, organizationId), ne(member.userId, ownerUserId))),
  ]);

  return {
    memberCount: Number(memberRow?.value ?? 0),
    cotisationCount: Number(cotisationRow?.value ?? 0),
    paymentCount: Number(paymentRow?.value ?? 0),
    meetingCount: Number(meetingRow?.value ?? 0),
    otherUserCount: Number(otherUserRow?.value ?? 0),
  };
}
