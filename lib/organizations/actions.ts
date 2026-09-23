"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { requireOrgAccess } from "@/lib/auth/org";
import { db } from "@/lib/db";
import {
  associationMembers,
  cotisationTypes,
  cotisations,
  documents,
  meetingAttendance,
  meetings,
  minutes,
  organization,
  organizationInviteLinks,
  organizationStorageUsage,
  paymentReminders,
  payments,
  pendingInvitations,
  transactions,
} from "@/lib/db/schema";
import { deleteDocumentBlobs } from "@/lib/documents/blob";
import { listDocumentBlobPathnamesForOrganization } from "@/lib/documents/queries";
import { deleteOrganizationSchema } from "./schema";
import { getMemberRole, getUserOrganizations } from "./queries";

export type SwitchOrganizationResult = {
  ok: false;
  error: "notMember" | "unknown";
};

/**
 * Bascule l'organisation active de l'utilisateur (switcher d'organisations,
 * session 8B) — passe intégralement par l'API native Better-Auth
 * (`auth.api.setActiveOrganization`), jamais de manipulation manuelle de la
 * session. Cette API vérifie déjà en interne que l'utilisateur est membre de
 * l'organisation cible et lève une `APIError` sinon — aucune vérification
 * de membership à dupliquer ici (même patron `try/catch` que
 * `auth.api.signUpEmail` dans `lib/invitations/actions.ts`).
 */
export async function switchActiveOrganization(
  organizationId: string,
): Promise<SwitchOrganizationResult | void> {
  let organization;
  try {
    organization = await auth.api.setActiveOrganization({
      headers: await headers(),
      body: { organizationId },
    });
  } catch {
    return { ok: false, error: "notMember" };
  }

  if (!organization) {
    return { ok: false, error: "unknown" };
  }

  redirect(`/${organization.slug}`);
}

export type DeleteOrganizationResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: "validation" | "forbidden" | "unknown" };

/**
 * Supprime définitivement une organisation (hard delete, chantier
 * "suppression d'organisation") — seul le `owner` peut le faire.
 *
 * Trois phases, comme `lib/settings/actions.ts::deleteMyAccount` :
 *  - Phase A0, avant toute suppression : on relève les `blob_pathname` de
 *    tous les documents de l'organisation (chantier Documents) — une fois les
 *    lignes `documents` supprimées en phase A, cette information est perdue.
 *  - Phase A, atomique (`db.batch`) : les 13 tables métier portant
 *    `organization_id`, dans l'ordre topologique de leurs FK (les plus
 *    dépendantes d'abord — présences avant réunions, paiements avant
 *    cotisations, documents avant paiements/réunions qu'ils référencent,
 *    etc.). Aucune n'a de FK en cascade vers `organization` ; si on
 *    supprimait l'organisation avant d'avoir vidé ces tables, Postgres
 *    rejetterait la suppression pour violation de contrainte.
 *  - Phase A1, après le commit de A : purge des blobs Vercel relevés en A0
 *    (`deleteDocumentBlobs`, best-effort — les lignes `documents` sont de
 *    toute façon déjà supprimées, un échec ne laisse rien à "réessayer"
 *    proprement ; au pire un blob orphelin reste facturé, cas résiduel non
 *    traité en V1, cf. plan validé).
 *  - Phase B, après A1 : `auth.api.deleteOrganization`, qui supprime déjà
 *    lui-même, en interne, toutes les lignes `member` et `invitation` de
 *    l'organisation avant l'organisation elle-même
 *    (`node_modules/better-auth/dist/plugins/organization/adapter.mjs`) —
 *    rien à supprimer nous-mêmes sur `member`.
 *
 * Contrairement à `deleteMyAccount`, un échec de la phase B fait échouer
 * l'action : laisser une organisation vide mais toujours existante sans le
 * signaler serait pire qu'une erreur invitant à réessayer (relancer
 * réussirait, les tables métier étant déjà vides).
 */
export async function deleteOrganization(
  orgSlug: string,
  raw: unknown,
): Promise<DeleteOrganizationResult> {
  const { organizationId, userId } = await requireOrgAccess(orgSlug);

  const parsed = deleteOrganizationSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  // Défense en profondeur : l'API native `deleteOrganization` vérifie aussi
  // la permission `organization:delete` (owner uniquement) en interne.
  const role = await getMemberRole(organizationId, userId);
  if (role !== "owner") {
    return { ok: false, error: "forbidden" };
  }

  const [org] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  if (!org || parsed.data.confirmation !== org.name) {
    return { ok: false, error: "validation" };
  }

  const documentBlobPathnames = await listDocumentBlobPathnamesForOrganization(organizationId);

  try {
    await db.batch([
      db.delete(documents).where(eq(documents.organizationId, organizationId)),
      db
        .delete(organizationStorageUsage)
        .where(eq(organizationStorageUsage.organizationId, organizationId)),
      db.delete(meetingAttendance).where(eq(meetingAttendance.organizationId, organizationId)),
      db.delete(minutes).where(eq(minutes.organizationId, organizationId)),
      db.delete(paymentReminders).where(eq(paymentReminders.organizationId, organizationId)),
      db.delete(transactions).where(eq(transactions.organizationId, organizationId)),
      db.delete(payments).where(eq(payments.organizationId, organizationId)),
      db.delete(meetings).where(eq(meetings.organizationId, organizationId)),
      db.delete(cotisations).where(eq(cotisations.organizationId, organizationId)),
      db.delete(cotisationTypes).where(eq(cotisationTypes.organizationId, organizationId)),
      db.delete(associationMembers).where(eq(associationMembers.organizationId, organizationId)),
      db.delete(pendingInvitations).where(eq(pendingInvitations.organizationId, organizationId)),
      db
        .delete(organizationInviteLinks)
        .where(eq(organizationInviteLinks.organizationId, organizationId)),
    ]);
  } catch {
    return { ok: false, error: "unknown" };
  }

  // Best-effort : les lignes `documents` sont déjà supprimées, un échec ici
  // laisse au pire un blob orphelin (facturé mais non recensé) plutôt que de
  // faire échouer toute la suppression de l'organisation pour ce nettoyage
  // secondaire.
  await deleteDocumentBlobs(documentBlobPathnames);

  const requestHeaders = await headers();
  try {
    await auth.api.deleteOrganization({
      headers: requestHeaders,
      body: { organizationId },
    });
  } catch {
    return { ok: false, error: "unknown" };
  }

  const remainingOrgs = await getUserOrganizations(userId);
  const nextOrg = remainingOrgs[0];
  if (!nextOrg) {
    return { ok: true, redirectTo: "/onboarding" };
  }
  try {
    await auth.api.setActiveOrganization({
      headers: requestHeaders,
      body: { organizationId: nextOrg.id },
    });
  } catch {
    // Non bloquant : l'organisation est déjà supprimée, la redirection vers
    // le tableau de bord d'une autre organisation reste valide même si le
    // changement d'organisation active échoue (elle se refera à la prochaine
    // navigation explicite de l'utilisateur).
  }

  return { ok: true, redirectTo: `/${nextOrg.slug}` };
}
