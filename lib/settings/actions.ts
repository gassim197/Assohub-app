"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { APIError } from "better-auth/api";

import { auth } from "@/lib/auth";
import { requireOrgAccess } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { member, user } from "@/lib/db/auth-schema";
import { associationMembers } from "@/lib/db/members-schema";
import {
  getUserSoleOwnedOrganizations,
  type SoleOwnedOrganization,
} from "@/lib/organizations/queries";
import { sendAccountDeletedEmail } from "@/lib/email/account-deleted-email";
import {
  changePasswordSchema,
  deleteAccountSchema,
  setPasswordSchema,
  updateOrganizationSchema,
  updateProfileSchema,
} from "./schema";

export type UpdateOrganizationResult =
  | { ok: true }
  | { ok: false; error: "validation" | "forbidden" | "unknown" };

export type UpdateProfileResult =
  | { ok: true }
  | { ok: false; error: "validation" | "unknown" };

export type ChangePasswordResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "invalidCurrentPassword" | "noPasswordSet" | "unknown";
    };

export type SetPasswordResult =
  | { ok: true }
  | { ok: false; error: "validation" | "alreadySet" | "unknown" };

export type DeleteAccountResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "soleOwner" | "unknown";
      organizations?: SoleOwnedOrganization[];
    };

/**
 * Modifie le nom et le type de l'organisation active. Le slug n'est jamais
 * transmis à `updateOrganization` : il reste stable même si le nom change
 * (schema-design — les liens partagés et l'URL de l'organisation ne doivent
 * pas casser).
 *
 * `auth.api.updateOrganization` applique le contrôle d'accès natif Better-Auth
 * (`organization:update`, rôles owner/admin uniquement) — accepté tel quel
 * pour cette session, pas de contournement manuel. Un membre "member" (rôle
 * par défaut de tous les invités, `lib/invitations/actions.ts`) reçoit donc
 * une erreur "forbidden" claire plutôt qu'un échec silencieux.
 */
export async function updateOrganization(
  orgSlug: string,
  raw: unknown,
): Promise<UpdateOrganizationResult> {
  const { organizationId } = await requireOrgAccess(orgSlug);

  const parsed = updateOrganizationSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  try {
    await auth.api.updateOrganization({
      headers: await headers(),
      body: {
        organizationId,
        data: {
          name: parsed.data.name,
          metadata: { type: parsed.data.type },
        },
      },
    });
  } catch (error) {
    if (error instanceof APIError && error.status === "FORBIDDEN") {
      return { ok: false, error: "forbidden" };
    }
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/settings`);
  return { ok: true };
}

/** Modifie le nom affiché de l'utilisateur (email non modifiable en V1). */
export async function updateProfile(
  orgSlug: string,
  raw: unknown,
): Promise<UpdateProfileResult> {
  await requireOrgAccess(orgSlug);

  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  try {
    await auth.api.updateUser({
      headers: await headers(),
      body: { name: parsed.data.name },
    });
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/settings`);
  return { ok: true };
}

const ANONYMIZED_NAME = "Utilisateur supprimé";
const ANONYMIZED_MEMBER_NAME = "Membre supprimé";

function anonymizedEmail(userId: string): string {
  return `deleted-${userId}@anonymized.local`;
}

/**
 * Supprime (anonymise) le compte de l'utilisateur courant — chantier "zone
 * de danger". Décisions produit : anonymisation soft (le `user` row est
 * conservé, jamais supprimé, pour préserver les jointures historiques —
 * paiements/transactions "enregistré par" continuent de résoudre vers ce
 * user, avec un nom anonymisé), refus si seul propriétaire d'une org (pas de
 * transfert de propriété en V1), retrait de toutes les orgs d'un coup, email
 * libéré pour une future inscription.
 *
 * Atomicité en deux phases (le détail est dans le plan de session) :
 *  - Phase A (`db.batch`, tout ou rien) : anonymise `user`, anonymise/soft-
 *    delete les lignes `association_members` liées, retire les lignes
 *    `member` (ACL Better-Auth) de toutes les organisations.
 *  - Phase B (après le commit de A, best-effort mais loggé si ça échoue) :
 *    délie les comptes externes (`unlinkAccount` — credential + Google, sinon
 *    une reconnexion Google pourrait ramener sur le profil anonymisé via
 *    `findAccountByProviderId`, indépendant de l'email) puis révoque toutes
 *    les sessions (`revokeSessions`). Ne peut pas vivre dans le même
 *    `db.batch()` : ce sont des endpoints Better-Auth, pas des statements
 *    Drizzle.
 */
export async function deleteMyAccount(
  orgSlug: string,
  raw: unknown,
): Promise<DeleteAccountResult> {
  const { userId } = await requireOrgAccess(orgSlug);

  const parsed = deleteAccountSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  // Jamais de confiance dans l'état client : re-vérifié ici, juste avant les
  // écritures, même si la page l'a déjà vérifié au chargement.
  const soleOwnedOrganizations = await getUserSoleOwnedOrganizations(userId);
  if (soleOwnedOrganizations.length > 0) {
    return { ok: false, error: "soleOwner", organizations: soleOwnedOrganizations };
  }

  const [currentUser] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  try {
    await db.batch([
      db
        .update(user)
        .set({
          name: ANONYMIZED_NAME,
          email: anonymizedEmail(userId),
          emailVerified: false,
          image: null,
        })
        .where(eq(user.id, userId)),
      db
        .update(associationMembers)
        .set({
          fullName: ANONYMIZED_MEMBER_NAME,
          phoneNumber: "",
          email: null,
          status: "démissionné",
          leftAt: new Date().toISOString().slice(0, 10),
          deletedAt: new Date(),
        })
        .where(and(eq(associationMembers.userId, userId), isNull(associationMembers.deletedAt))),
      db.delete(member).where(eq(member.userId, userId)),
    ]);
  } catch {
    return { ok: false, error: "unknown" };
  }

  // Phase B : best-effort. L'anonymisation (irréversible et déjà commitée)
  // ne doit pas être remise en cause par un souci technique ici.
  try {
    const requestHeaders = await headers();
    const accounts = await auth.api.listUserAccounts({ headers: requestHeaders });
    for (const account of accounts) {
      await auth.api.unlinkAccount({
        headers: requestHeaders,
        body: { providerId: account.providerId, accountId: account.accountId },
      });
    }
    await auth.api.revokeSessions({ headers: requestHeaders });
  } catch (error) {
    console.error("[settings] échec de l'invalidation sessions/comptes après anonymisation", error);
  }

  if (currentUser?.email) {
    try {
      await sendAccountDeletedEmail({ to: currentUser.email });
    } catch (error) {
      console.error("[settings] échec de l'envoi de l'email de suppression de compte", error);
    }
  }

  return { ok: true };
}

/** Change le mot de passe d'un utilisateur qui en a déjà un (vérifie l'ancien). */
export async function changeUserPassword(
  orgSlug: string,
  raw: unknown,
): Promise<ChangePasswordResult> {
  await requireOrgAccess(orgSlug);

  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      },
    });
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "INVALID_PASSWORD") {
      return { ok: false, error: "invalidCurrentPassword" };
    }
    if (error instanceof APIError && error.body?.code === "CREDENTIAL_ACCOUNT_NOT_FOUND") {
      return { ok: false, error: "noPasswordSet" };
    }
    return { ok: false, error: "unknown" };
  }

  return { ok: true };
}

/** Définit un premier mot de passe pour un compte Google-only (aucun mot de passe existant). */
export async function setUserPassword(
  orgSlug: string,
  raw: unknown,
): Promise<SetPasswordResult> {
  await requireOrgAccess(orgSlug);

  const parsed = setPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  try {
    await auth.api.setPassword({
      headers: await headers(),
      body: { newPassword: parsed.data.newPassword },
    });
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "PASSWORD_ALREADY_SET") {
      return { ok: false, error: "alreadySet" };
    }
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/settings`);
  return { ok: true };
}
