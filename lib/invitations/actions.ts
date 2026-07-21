"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { requireOrgAccess } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { member, user } from "@/lib/db/auth-schema";
import {
  associationMembers,
  organizationInviteLinks,
  pendingInvitations,
} from "@/lib/db/members-schema";
import { toE164 } from "@/lib/phone";
import { getAppUrl } from "@/lib/url";
import { buildVerifyEmailCallbackURL } from "@/lib/auth/verify-email";
import { sendInvitationEmail } from "@/lib/email/invitation-email";
import {
  INVITATION_EXPIRY_DAYS,
  isInviteLinkAcceptanceMode,
  resolveAcceptPageState,
  resolveInviteLinkExpiresAt,
  resolveInviteLinkPageState,
} from "./constants";
import {
  findAssociationMemberByUser,
  findUserIdByEmail,
  getInvitationByToken,
  getInviteLinkByToken,
} from "./queries";
import {
  generateInviteLinkServerSchema,
  inviteMemberServerSchema,
  registerInviteeServerSchema,
  registerViaLinkServerSchema,
} from "./schema";
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

export type RegisterAndJoinResult = {
  ok: false;
  error: "invalidInvitation" | "validation" | "phoneInvalid" | "emailTaken" | "unknown";
};

/**
 * Inscription + rattachement d'un nouvel invité (volet 2 de la 4B,
 * checkpoint 2). Le `token` est la seule autorité : on re-vérifie son état à
 * l'instant T (protège contre un onglet resté ouvert sur une invitation entre
 * temps expirée/acceptée/annulée ailleurs).
 *
 * Pas de vraie transaction SQL (neon-http ne le permet pas, cf.
 * `lib/auth/index.ts`) : on avance dans un ordre qui rend chaque échec
 * compensable — création du compte d'abord, et on le supprime (cascade
 * `account`/`session`) si une étape suivante échoue. Le seul cas qu'on
 * n'annule PAS est l'échec du marquage `accepted_at` final : à ce stade le
 * compte et l'appartenance existent déjà, l'utilisateur est bien onboardé.
 *
 * Ne retourne qu'en cas d'erreur : le succès se termine par un `redirect`
 * (jamais de retour au client).
 */
export async function registerAndJoin(
  token: string,
  raw: unknown,
): Promise<RegisterAndJoinResult> {
  const data = await getInvitationByToken(token);
  const state = resolveAcceptPageState(data);
  if (state !== "pending") {
    return { ok: false, error: "invalidInvitation" };
  }
  const { invitation, organization } = data!;
  // `organization` est garanti non-null : resolveAcceptPageState renvoie
  // "orgDeleted" (donc pas "pending") sinon.
  const org = organization!;

  const parsed = registerInviteeServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const values = parsed.data;

  const phoneE164 = toE164(values.phoneNumber);
  if (!phoneE164) {
    return { ok: false, error: "phoneInvalid" };
  }

  // Pré-check (UX) : l'autorité reste l'erreur de `signUpEmail` plus bas, qui
  // couvre la course entre ce check et la création effective du compte.
  const existingUserId = await findUserIdByEmail(invitation.email);
  if (existingUserId) {
    return { ok: false, error: "emailTaken" };
  }

  let newUserId: string;
  try {
    const result = await auth.api.signUpEmail({
      body: {
        name: values.fullName,
        email: invitation.email,
        password: values.password,
      },
    });
    newUserId = result.user.id;
  } catch {
    return { ok: false, error: "emailTaken" };
  }

  // Vérifiée d'office (chantier 3) : l'invité a déjà reçu et cliqué le lien
  // d'invitation DANS sa boîte mail, une double vérification serait absurde.
  // `signUpEmail` ne pose pas de session tant que `requireEmailVerification`
  // est actif (lib/auth/index.ts) : on la recrée nous-mêmes via `signInEmail`
  // pour préserver l'auto-connexion existante de ce flow.
  try {
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, newUserId));
    await auth.api.signInEmail({
      body: { email: invitation.email, password: values.password },
    });
  } catch {
    await db.delete(user).where(eq(user.id, newUserId));
    return { ok: false, error: "unknown" };
  }

  try {
    await db.insert(associationMembers).values({
      id: newId(),
      organizationId: org.id,
      userId: newUserId,
      fullName: values.fullName,
      phoneNumber: phoneE164,
      email: invitation.email,
      role: invitation.intendedRole,
      status: "actif",
    });
  } catch {
    await db.delete(user).where(eq(user.id, newUserId));
    return { ok: false, error: "unknown" };
  }

  try {
    await db.insert(member).values({
      id: newId(),
      organizationId: org.id,
      userId: newUserId,
      role: "member",
      createdAt: new Date(),
    });
  } catch {
    await db
      .delete(associationMembers)
      .where(
        and(
          eq(associationMembers.organizationId, org.id),
          eq(associationMembers.userId, newUserId),
        ),
      );
    await db.delete(user).where(eq(user.id, newUserId));
    return { ok: false, error: "unknown" };
  }

  try {
    await db
      .update(pendingInvitations)
      .set({ acceptedAt: new Date() })
      .where(
        and(eq(pendingInvitations.id, invitation.id), eq(pendingInvitations.token, token)),
      );
  } catch (error) {
    // Compte et appartenance déjà créés : on ne rollback pas, même logique
    // dégradée que l'échec d'envoi d'email (cf. `inviteMember`).
    console.error(
      "[invitations] échec du marquage accepted_at après inscription réussie",
      error,
    );
  }

  revalidatePath(`/${org.slug}`);
  redirect(`/${org.slug}?welcome=true`);
}

export type JoinExistingOrganizationResult = {
  ok: false;
  error: "invalidInvitation" | "sessionMismatch" | "unauthenticated" | "unknown";
};

/**
 * Rattache un utilisateur déjà authentifié à l'organisation de l'invitation
 * (volet 2 de la 4B, checkpoint 3a — arrivée sur `/invitations/accept/[token]`
 * après un `/login?redirect=...&email=...`).
 *
 * Défense en profondeur : re-vérifie la session ET que son email correspond
 * bien à celui de l'invitation, même si l'UI n'affiche ce bouton que dans ce
 * cas précis (le token seul ne suffit plus à autoriser l'action une fois un
 * compte impliqué).
 */
export async function joinExistingOrganization(
  token: string,
): Promise<JoinExistingOrganizationResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "unauthenticated" };
  }

  const data = await getInvitationByToken(token);
  const state = resolveAcceptPageState(data);
  if (state !== "pending") {
    return { ok: false, error: "invalidInvitation" };
  }
  const { invitation, organization } = data!;
  const org = organization!;

  if (session.user.email !== invitation.email) {
    return { ok: false, error: "sessionMismatch" };
  }

  const userId = session.user.id;

  // Idempotent : un double-clic ou un rechargement ne doit pas dupliquer les
  // lignes `association_members`/`member` si l'une des deux existe déjà.
  const [existingAssociationMember] = await db
    .select({ id: associationMembers.id })
    .from(associationMembers)
    .where(
      and(
        eq(associationMembers.organizationId, org.id),
        eq(associationMembers.userId, userId),
        isNull(associationMembers.deletedAt),
      ),
    )
    .limit(1);

  let createdAssociationMember = false;
  if (!existingAssociationMember) {
    try {
      await db.insert(associationMembers).values({
        id: newId(),
        organizationId: org.id,
        userId,
        fullName: session.user.name,
        // Pas de saisie de téléphone dans ce flow (compte déjà existant) :
        // on reprend celui de l'invitation si renseigné, sinon vide — même
        // convention que `ensureFounderMember`, à compléter via le CRUD Membres.
        phoneNumber: invitation.phoneNumber ?? "",
        email: invitation.email,
        role: invitation.intendedRole,
        status: "actif",
      });
      createdAssociationMember = true;
    } catch {
      return { ok: false, error: "unknown" };
    }
  }

  const [existingLink] = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.organizationId, org.id), eq(member.userId, userId)))
    .limit(1);

  if (!existingLink) {
    try {
      await db.insert(member).values({
        id: newId(),
        organizationId: org.id,
        userId,
        role: "member",
        createdAt: new Date(),
      });
    } catch {
      if (createdAssociationMember) {
        await db
          .delete(associationMembers)
          .where(
            and(
              eq(associationMembers.organizationId, org.id),
              eq(associationMembers.userId, userId),
            ),
          );
      }
      return { ok: false, error: "unknown" };
    }
  }

  try {
    await db
      .update(pendingInvitations)
      .set({ acceptedAt: new Date() })
      .where(
        and(eq(pendingInvitations.id, invitation.id), eq(pendingInvitations.token, token)),
      );
  } catch (error) {
    console.error(
      "[invitations] échec du marquage accepted_at (rejoindre - compte existant)",
      error,
    );
  }

  revalidatePath(`/${org.slug}`);
  redirect(`/${org.slug}?welcome=true`);
}

export type DeclineInvitationResult = { ok: false; error: "invalidInvitation" | "unknown" };

/**
 * Refus d'invitation (volet 2 de la 4B, checkpoint 3b) : public, pas de
 * session requise. Le token reste la seule autorité.
 */
export async function declineInvitation(
  token: string,
): Promise<DeclineInvitationResult> {
  const data = await getInvitationByToken(token);
  const state = resolveAcceptPageState(data);
  if (state !== "pending") {
    return { ok: false, error: "invalidInvitation" };
  }
  const { invitation } = data!;

  try {
    await db
      .update(pendingInvitations)
      .set({ declinedAt: new Date() })
      .where(
        and(eq(pendingInvitations.id, invitation.id), eq(pendingInvitations.token, token)),
      );
  } catch {
    return { ok: false, error: "unknown" };
  }

  redirect("/invitations/declined");
}

export type GenerateInviteLinkResult =
  | { ok: true }
  | { ok: false; error: "validation" | "unknown" };

/**
 * Génère le lien d'invitation partageable d'une organisation (volet 3 de la
 * 4B, checkpoint 1). Un seul lien actif à la fois : révoque explicitement
 * tout lien non révoqué/non supprimé avant d'insérer le nouveau — neon-http
 * ne permet pas de vraie transaction SQL (même contrainte que
 * `registerAndJoin`), donc ces deux écritures ne sont pas atomiques, mais
 * l'ordre choisi ne laisse jamais deux liens actifs simultanément en cas de
 * succès partiel (au pire, un état transitoire sans aucun lien actif).
 *
 * Le client confirme déjà côté UI qu'il révoque bien un lien existant
 * (AlertDialog "Générer un nouveau lien") avant d'ouvrir ce formulaire.
 */
export async function generateOrganizationInviteLink(
  orgSlug: string,
  raw: unknown,
): Promise<GenerateInviteLinkResult> {
  const { organizationId, userId } = await requireOrgAccess(orgSlug);

  const parsed = generateInviteLinkServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  const expiresAt = resolveInviteLinkExpiresAt(
    data.expiryOption,
    data.customExpiresAt ? new Date(data.customExpiresAt) : null,
  );
  const maxUses = data.maxUsesOption === "limited" ? data.maxUsesValue ?? null : null;

  try {
    await db
      .update(organizationInviteLinks)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(organizationInviteLinks.organizationId, organizationId),
          isNull(organizationInviteLinks.revokedAt),
          isNull(organizationInviteLinks.deletedAt),
        ),
      );

    await db.insert(organizationInviteLinks).values({
      id: newId(),
      organizationId,
      token: generateInvitationToken(),
      createdByUserId: userId,
      acceptanceMode: data.acceptanceMode,
      defaultRole: data.defaultRole,
      expiresAt,
      maxUses,
    });
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/members`);
  return { ok: true };
}

export type RevokeInviteLinkResult =
  | { ok: true }
  | { ok: false; error: "notFound" | "unknown" };

/** Révoque le lien d'invitation actif (bouton "Révoquer le lien", destructif et explicite). */
export async function revokeOrganizationInviteLink(
  orgSlug: string,
  linkId: string,
): Promise<RevokeInviteLinkResult> {
  const { organizationId } = await requireOrgAccess(orgSlug);

  let updated: { id: string } | undefined;
  try {
    [updated] = await db
      .update(organizationInviteLinks)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(organizationInviteLinks.id, linkId),
          eq(organizationInviteLinks.organizationId, organizationId),
          isNull(organizationInviteLinks.revokedAt),
        ),
      )
      .returning({ id: organizationInviteLinks.id });
  } catch {
    return { ok: false, error: "unknown" };
  }

  if (!updated) {
    return { ok: false, error: "notFound" };
  }

  revalidatePath(`/${orgSlug}/members`);
  return { ok: true };
}

export type RegisterAndJoinViaLinkResult = {
  ok: false;
  error: "invalidLink" | "validation" | "phoneInvalid" | "emailAlreadyExists" | "unknown";
};

/**
 * Inscription + rattachement via lien d'invitation partageable (volet 4 de la
 * 4B, checkpoint 2). Contrairement à `registerAndJoin` (invitation
 * nominative), l'email n'est pas connu à l'avance : c'est un champ du
 * formulaire, d'où `emailAlreadyExists` en plus des erreurs habituelles.
 *
 * L'état du lien est re-vérifié ICI (pas seulement à l'affichage de la page) :
 * un onglet resté ouvert ne doit pas pouvoir contourner une révocation, une
 * expiration ou un quota atteint entre-temps.
 *
 * Mode `auto` → membre actif immédiat (ligne `member` créée, accès dashboard).
 * Mode `manual` → `association_members` en `en_attente_validation`, PAS de
 * ligne `member` (aucun accès tant qu'un admin n'a pas validé la demande).
 */
export async function registerAndJoinViaLink(
  token: string,
  raw: unknown,
): Promise<RegisterAndJoinViaLinkResult> {
  const data = await getInviteLinkByToken(token);
  const state = resolveInviteLinkPageState(data);
  if (state !== "active") {
    return { ok: false, error: "invalidLink" };
  }
  const { link, organization } = data!;
  // `organization` est garanti non-null : resolveInviteLinkPageState renvoie
  // "orgDeleted" (donc pas "active") sinon.
  const org = organization!;

  const parsed = registerViaLinkServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const values = parsed.data;

  const phoneE164 = toE164(values.phoneNumber);
  if (!phoneE164) {
    return { ok: false, error: "phoneInvalid" };
  }

  // Pré-check (UX) : l'autorité reste l'erreur de `signUpEmail` plus bas, qui
  // couvre la course entre ce check et la création effective du compte.
  const existingUserId = await findUserIdByEmail(values.email);
  if (existingUserId) {
    return { ok: false, error: "emailAlreadyExists" };
  }

  let newUserId: string;
  try {
    const result = await auth.api.signUpEmail({
      body: {
        name: values.fullName,
        email: values.email,
        password: values.password,
      },
    });
    newUserId = result.user.id;
  } catch {
    return { ok: false, error: "emailAlreadyExists" };
  }

  const acceptanceMode = isInviteLinkAcceptanceMode(link.acceptanceMode)
    ? link.acceptanceMode
    : "auto";
  const status = acceptanceMode === "auto" ? "actif" : "en_attente_validation";
  // Contrairement à l'invitation nominative, l'email saisi via un lien
  // partageable n'est pas implicitement vérifié (la personne a juste cliqué
  // un lien WhatsApp) : vérification email normale, requise avant connexion
  // (`requireEmailVerification`, lib/auth/index.ts) — en plus, pour le mode
  // manuel, de la validation admin (`approveJoinRequest`), les deux portes
  // étant indépendantes.
  const verifyEmailNext = acceptanceMode === "auto" ? "home" : "joinPending";
  try {
    await auth.api.sendVerificationEmail({
      body: {
        email: values.email,
        callbackURL: buildVerifyEmailCallbackURL(values.email, verifyEmailNext),
      },
    });
  } catch (error) {
    console.error(
      "[invitations] échec d'envoi de l'email de vérification (inscription via lien)",
      error,
    );
  }

  try {
    await db.insert(associationMembers).values({
      id: newId(),
      organizationId: org.id,
      userId: newUserId,
      fullName: values.fullName,
      phoneNumber: phoneE164,
      email: values.email,
      role: link.defaultRole,
      status,
    });
  } catch {
    await db.delete(user).where(eq(user.id, newUserId));
    return { ok: false, error: "unknown" };
  }

  if (acceptanceMode === "auto") {
    try {
      await db.insert(member).values({
        id: newId(),
        organizationId: org.id,
        userId: newUserId,
        role: "member",
        createdAt: new Date(),
      });
    } catch {
      await db
        .delete(associationMembers)
        .where(
          and(
            eq(associationMembers.organizationId, org.id),
            eq(associationMembers.userId, newUserId),
          ),
        );
      await db.delete(user).where(eq(user.id, newUserId));
      return { ok: false, error: "unknown" };
    }
  }

  try {
    await db
      .update(organizationInviteLinks)
      .set({ usesCount: sql`${organizationInviteLinks.usesCount} + 1` })
      .where(eq(organizationInviteLinks.id, link.id));
  } catch (error) {
    console.error(
      "[invitations] échec de l'incrément usesCount (inscription via lien)",
      error,
    );
  }

  if (acceptanceMode === "auto") {
    revalidatePath(`/${org.slug}`);
  }

  // La vérification email bloque la connexion (mode strict, chantier 3) :
  // pas d'accès direct au dashboard ni à `/join/pending` tant qu'elle n'est
  // pas faite, même en mode auto où la ligne `member` existe déjà — dès la
  // vérification, `autoSignInAfterVerification` pose la session et
  // `verifyEmailNext` renvoie vers la bonne destination.
  redirect(
    `/verify-email?email=${encodeURIComponent(values.email)}&next=${verifyEmailNext}`,
  );
}

export type JoinViaInviteLinkResult =
  | { ok: false; error: "invalidLink" | "unauthenticated" | "unknown" };

/**
 * Rattachement via lien partageable pour un visiteur déjà authentifié (volet
 * 4 de la 4B, checkpoint 2). Pas de vérification d'email (contrairement à
 * `joinExistingOrganization`) : un lien partageable n'a pas de destinataire
 * nommé — seule la contrainte "pas déjà membre" s'applique, déjà vérifiée en
 * amont par la page (`AlreadyMemberNotice`, brief point A) ; le check ici est
 * une défense en profondeur/idempotence (double clic, onglet dupliqué).
 */
export async function joinViaInviteLink(
  token: string,
): Promise<JoinViaInviteLinkResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "unauthenticated" };
  }

  const data = await getInviteLinkByToken(token);
  const state = resolveInviteLinkPageState(data);
  if (state !== "active") {
    return { ok: false, error: "invalidLink" };
  }
  const { link, organization } = data!;
  const org = organization!;
  const userId = session.user.id;

  const existing = await findAssociationMemberByUser(org.id, userId);

  if (existing) {
    // Idempotent : déjà membre actif, ou demande déjà en attente — dans les
    // deux cas, aucune nouvelle écriture n'est nécessaire.
    redirect(existing.status === "actif" ? `/${org.slug}` : "/join/pending");
  }

  const acceptanceMode = isInviteLinkAcceptanceMode(link.acceptanceMode)
    ? link.acceptanceMode
    : "auto";
  const status = acceptanceMode === "auto" ? "actif" : "en_attente_validation";

  try {
    await db.insert(associationMembers).values({
      id: newId(),
      organizationId: org.id,
      userId,
      fullName: session.user.name,
      // Pas de saisie de téléphone dans ce flow (compte déjà existant) —
      // même convention que `joinExistingOrganization`.
      phoneNumber: "",
      email: session.user.email,
      role: link.defaultRole,
      status,
    });
  } catch {
    return { ok: false, error: "unknown" };
  }

  if (acceptanceMode === "auto") {
    try {
      await db.insert(member).values({
        id: newId(),
        organizationId: org.id,
        userId,
        role: "member",
        createdAt: new Date(),
      });
    } catch {
      await db
        .delete(associationMembers)
        .where(
          and(
            eq(associationMembers.organizationId, org.id),
            eq(associationMembers.userId, userId),
          ),
        );
      return { ok: false, error: "unknown" };
    }
  }

  try {
    await db
      .update(organizationInviteLinks)
      .set({ usesCount: sql`${organizationInviteLinks.usesCount} + 1` })
      .where(eq(organizationInviteLinks.id, link.id));
  } catch (error) {
    console.error(
      "[invitations] échec de l'incrément usesCount (rejoindre via lien - compte existant)",
      error,
    );
  }

  if (acceptanceMode === "auto") {
    revalidatePath(`/${org.slug}`);
    redirect(`/${org.slug}?welcome=true`);
  }

  redirect("/join/pending");
}
