"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { requireOrgAccess } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { user } from "@/lib/db/auth-schema";
import { associationMembers, pendingInvitations } from "@/lib/db/members-schema";
import { toE164 } from "@/lib/phone";
import { getAppUrl } from "@/lib/url";
import { sendInvitationEmail } from "@/lib/email/invitation-email";
import { INVITATION_EXPIRY_DAYS } from "./constants";
import { inviteMemberServerSchema } from "./schema";
import { generateInvitationToken } from "./tokens";

export type InviteMemberResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "alreadyMember" | "invitationPending" | "phoneInvalid" | "unknown";
      field?: "email" | "phoneNumber";
    };

/** Résultat des actions ciblées (renvoyer, annuler) sans champ de formulaire. */
export type InvitationActionResult =
  | { ok: true }
  | { ok: false; error: "notFound" | "unknown" };

function expiresAtFromNow(): Date {
  const date = new Date();
  date.setDate(date.getDate() + INVITATION_EXPIRY_DAYS);
  return date;
}

async function getInviterName(userId: string): Promise<string> {
  const [row] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row?.name ?? "Un membre de l'équipe";
}

/**
 * Invite une personne par email (schema-design §4.4, volet 1 de la 4B).
 *
 * Multi-tenancy et validation suivent exactement le pattern de
 * `lib/members/actions.ts::createMember` : garde `requireOrgAccess` en tête,
 * Zod `safeParse`, écritures bornées à l'organisation.
 */
export async function inviteMember(
  orgSlug: string,
  raw: unknown,
): Promise<InviteMemberResult> {
  const { organizationId, userId, organization } = await requireOrgAccess(orgSlug);

  const parsed = inviteMemberServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  const phoneE164 = data.phoneNumber ? toE164(data.phoneNumber) : null;
  if (data.phoneNumber && !phoneE164) {
    return { ok: false, error: "phoneInvalid", field: "phoneNumber" };
  }

  // Email déjà membre actif de l'organisation → erreur claire (brief 4B).
  const [existingMember] = await db
    .select({ id: associationMembers.id })
    .from(associationMembers)
    .where(
      and(
        eq(associationMembers.organizationId, organizationId),
        eq(associationMembers.email, data.email),
        eq(associationMembers.status, "actif"),
        isNull(associationMembers.deletedAt),
      ),
    )
    .limit(1);

  if (existingMember) {
    return { ok: false, error: "alreadyMember", field: "email" };
  }

  // Invitation déjà en cours (non résolue, non expirée) pour cet email → le
  // client proposera de la renouveler ou de l'annuler plutôt que d'en créer une seconde.
  const [existingInvitation] = await db
    .select({ id: pendingInvitations.id })
    .from(pendingInvitations)
    .where(
      and(
        eq(pendingInvitations.organizationId, organizationId),
        eq(pendingInvitations.email, data.email),
        isNull(pendingInvitations.acceptedAt),
        isNull(pendingInvitations.declinedAt),
        isNull(pendingInvitations.deletedAt),
        gt(pendingInvitations.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (existingInvitation) {
    return { ok: false, error: "invitationPending", field: "email" };
  }

  const token = generateInvitationToken();
  const expiresAt = expiresAtFromNow();

  try {
    await db.insert(pendingInvitations).values({
      id: newId(),
      organizationId,
      fullName: data.fullName,
      phoneNumber: phoneE164,
      email: data.email,
      intendedRole: data.intendedRole,
      personalMessage: data.personalMessage ?? null,
      token,
      invitedByUserId: userId,
      expiresAt,
    });
  } catch {
    return { ok: false, error: "unknown" };
  }

  // L'échec d'envoi de l'email ne fait pas échouer l'invitation : la ligne
  // existe déjà, le président pourra "Renvoyer" depuis l'onglet en attente.
  try {
    const [inviterName, tMembers] = await Promise.all([
      getInviterName(userId),
      getTranslations("members"),
    ]);
    await sendInvitationEmail({
      to: data.email,
      organizationName: organization.name,
      inviterName,
      roleLabel: tMembers(`roles.${data.intendedRole}`),
      personalMessage: data.personalMessage ?? null,
      acceptUrl: `${getAppUrl()}/invitations/accept/${token}`,
    });
  } catch (error) {
    console.error("[invitations] échec d'envoi de l'email d'invitation", error);
  }

  revalidatePath(`/${orgSlug}/members`);
  return { ok: true };
}

/**
 * Renvoie une invitation existante : prolonge `expires_at` et ré-émet l'email
 * (même token — un lien déjà reçu reste valide).
 */
export async function resendInvitation(
  orgSlug: string,
  invitationId: string,
): Promise<InvitationActionResult> {
  const { organizationId, organization } = await requireOrgAccess(orgSlug);

  const [existing] = await db
    .select()
    .from(pendingInvitations)
    .where(
      and(
        eq(pendingInvitations.id, invitationId),
        eq(pendingInvitations.organizationId, organizationId),
        isNull(pendingInvitations.acceptedAt),
        isNull(pendingInvitations.declinedAt),
        isNull(pendingInvitations.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) {
    return { ok: false, error: "notFound" };
  }

  const expiresAt = expiresAtFromNow();

  try {
    await db
      .update(pendingInvitations)
      .set({ expiresAt })
      .where(
        and(
          eq(pendingInvitations.id, invitationId),
          eq(pendingInvitations.organizationId, organizationId),
        ),
      );
  } catch {
    return { ok: false, error: "unknown" };
  }

  try {
    const [inviterName, tMembers] = await Promise.all([
      getInviterName(existing.invitedByUserId),
      getTranslations("members"),
    ]);
    await sendInvitationEmail({
      to: existing.email,
      organizationName: organization.name,
      inviterName,
      roleLabel: tMembers(`roles.${existing.intendedRole}`),
      personalMessage: existing.personalMessage,
      acceptUrl: `${getAppUrl()}/invitations/accept/${existing.token}`,
    });
  } catch (error) {
    console.error("[invitations] échec de renvoi de l'email d'invitation", error);
  }

  revalidatePath(`/${orgSlug}/members`);
  return { ok: true };
}

/** Annule une invitation en attente (soft delete, jamais de vrai delete). */
export async function cancelInvitation(
  orgSlug: string,
  invitationId: string,
): Promise<InvitationActionResult> {
  const { organizationId } = await requireOrgAccess(orgSlug);

  let updated: { id: string } | undefined;
  try {
    [updated] = await db
      .update(pendingInvitations)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(pendingInvitations.id, invitationId),
          eq(pendingInvitations.organizationId, organizationId),
          isNull(pendingInvitations.deletedAt),
        ),
      )
      .returning({ id: pendingInvitations.id });
  } catch {
    return { ok: false, error: "unknown" };
  }

  if (!updated) {
    return { ok: false, error: "notFound" };
  }

  revalidatePath(`/${orgSlug}/members`);
  return { ok: true };
}
