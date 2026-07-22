"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";

import { auth } from "@/lib/auth";
import { requireOrgAccess } from "@/lib/auth/org";
import {
  changePasswordSchema,
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
