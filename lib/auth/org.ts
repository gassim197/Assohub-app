import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { member, organization } from "@/lib/db/schema";

export interface OrgAccess {
  userId: string;
  organizationId: string;
  organization: { id: string; name: string; slug: string };
}

/**
 * Garde multi-tenant centrale du dashboard.
 *
 * Appelée en tête de CHAQUE page et CHAQUE Server Action métier. Elle :
 *   1. exige une session valide (sinon redirige vers /login) ;
 *   2. résout l'organisation par son slug ET vérifie que l'utilisateur en est
 *      membre (table `member` de Better-Auth) — sinon 404 (on ne révèle pas
 *      l'existence de l'organisation à un non-membre) ;
 *   3. retourne l'`organizationId` de confiance, jamais une valeur venant du client.
 *
 * Toutes les requêtes Drizzle métier doivent filtrer sur cet `organizationId`.
 */
export async function requireOrgAccess(orgSlug: string): Promise<OrgAccess> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;

  const [org] = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    })
    .from(organization)
    .where(eq(organization.slug, orgSlug))
    .limit(1);

  if (!org) {
    notFound();
  }

  const [membership] = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.organizationId, org.id), eq(member.userId, userId)))
    .limit(1);

  if (!membership) {
    notFound();
  }

  return { userId, organizationId: org.id, organization: org };
}
