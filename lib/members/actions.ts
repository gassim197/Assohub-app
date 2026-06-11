"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, ne } from "drizzle-orm";

import { requireOrgAccess } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { associationMembers } from "@/lib/db/members-schema";
import { toE164 } from "@/lib/phone";
import { EXIT_STATUSES, type MemberStatus } from "./constants";
import { changeStatusServerSchema, createMemberServerSchema } from "./schema";

export type CreateMemberResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "emailTaken" | "phoneInvalid" | "unknown";
      field?: "email" | "phoneNumber";
    };

/** Résultat des actions ciblées (statut, archivage) sans champ de formulaire. */
export type MemberActionResult =
  | { ok: true }
  | { ok: false; error: "validation" | "notFound" | "unknown" };

/** Date du jour au format `YYYY-MM-DD` (colonnes `date` du schéma). */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Calcule `left_at` en fonction du nouveau statut (schema-design §4.1).
 *
 * - Statut de sortie (démissionné/exclu/décédé) → on remplit `left_at`, en
 *   **préservant** une date de sortie déjà posée (une simple édition ne doit pas
 *   réécraser la vraie date de démission par la date du jour).
 * - Retour à un statut présent (actif/suspendu) → `left_at` repasse à `NULL`.
 */
function computeLeftAt(
  newStatus: MemberStatus,
  currentLeftAt: string | null,
): string | null {
  if (EXIT_STATUSES.includes(newStatus)) {
    return currentLeftAt ?? today();
  }
  return null;
}

/**
 * Crée un membre dans l'annuaire métier (schema-design §4).
 *
 * Multi-tenancy : `requireOrgAccess` vérifie que l'utilisateur appartient bien à
 * l'organisation cible et fournit un `organizationId` de confiance (jamais une
 * valeur venant du client). Validation Zod systématique côté serveur, même si le
 * client a déjà validé.
 */
export async function createMember(
  orgSlug: string,
  raw: unknown,
): Promise<CreateMemberResult> {
  // Garde multi-tenant (redirige / 404 si accès invalide — ne pas intercepter).
  const { organizationId } = await requireOrgAccess(orgSlug);

  const parsed = createMemberServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  // Normalisation E.164 stricte pour le stockage.
  const phoneE164 = toE164(data.phoneNumber);
  if (!phoneE164) {
    return { ok: false, error: "phoneInvalid", field: "phoneNumber" };
  }

  // Unicité de l'email dans l'organisation (parmi les membres non supprimés).
  if (data.email) {
    const [dupe] = await db
      .select({ id: associationMembers.id })
      .from(associationMembers)
      .where(
        and(
          eq(associationMembers.organizationId, organizationId),
          eq(associationMembers.email, data.email),
          isNull(associationMembers.deletedAt),
        ),
      )
      .limit(1);

    if (dupe) {
      return { ok: false, error: "emailTaken", field: "email" };
    }
  }

  try {
    await db.insert(associationMembers).values({
      id: newId(),
      organizationId,
      fullName: data.fullName,
      phoneNumber: phoneE164,
      email: data.email ?? null,
      dateOfBirth: data.dateOfBirth ?? null,
      profession: data.profession ?? null,
      notes: data.notes ?? null,
      role: data.role,
      customRole: data.role === "autre" ? (data.customRole ?? null) : null,
      status: data.status,
      joinedAt: data.joinedAt,
      // schema-design §4.1 : un statut de sortie remplit `left_at` dès la création.
      leftAt: computeLeftAt(data.status, null),
    });
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/members`);
  return { ok: true };
}

/**
 * Met à jour un membre existant (BLOC 3).
 *
 * Multi-tenancy : `requireOrgAccess` fournit l'`organizationId` de confiance, et
 * toutes les écritures sont bornées à `(id, organizationId, deleted_at IS NULL)`.
 * Un `memberId` appartenant à une autre organisation est traité comme introuvable.
 *
 * Réutilise le schéma Zod de création (mêmes champs). La dédup email exclut le
 * membre lui-même : il garde son email, mais ne peut pas prendre celui d'un autre.
 */
export async function updateMember(
  orgSlug: string,
  memberId: string,
  raw: unknown,
): Promise<CreateMemberResult> {
  const { organizationId } = await requireOrgAccess(orgSlug);

  const parsed = createMemberServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  // Le membre doit exister dans CETTE organisation et ne pas être archivé.
  const [existing] = await db
    .select({ id: associationMembers.id, leftAt: associationMembers.leftAt })
    .from(associationMembers)
    .where(
      and(
        eq(associationMembers.id, memberId),
        eq(associationMembers.organizationId, organizationId),
        isNull(associationMembers.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) {
    return { ok: false, error: "unknown" };
  }

  const phoneE164 = toE164(data.phoneNumber);
  if (!phoneE164) {
    return { ok: false, error: "phoneInvalid", field: "phoneNumber" };
  }

  // Unicité de l'email dans l'organisation, en excluant le membre courant.
  if (data.email) {
    const [dupe] = await db
      .select({ id: associationMembers.id })
      .from(associationMembers)
      .where(
        and(
          eq(associationMembers.organizationId, organizationId),
          eq(associationMembers.email, data.email),
          ne(associationMembers.id, memberId),
          isNull(associationMembers.deletedAt),
        ),
      )
      .limit(1);

    if (dupe) {
      return { ok: false, error: "emailTaken", field: "email" };
    }
  }

  try {
    await db
      .update(associationMembers)
      .set({
        fullName: data.fullName,
        phoneNumber: phoneE164,
        email: data.email ?? null,
        dateOfBirth: data.dateOfBirth ?? null,
        profession: data.profession ?? null,
        notes: data.notes ?? null,
        role: data.role,
        customRole: data.role === "autre" ? (data.customRole ?? null) : null,
        status: data.status,
        joinedAt: data.joinedAt,
        leftAt: computeLeftAt(data.status, existing.leftAt),
      })
      .where(
        and(
          eq(associationMembers.id, memberId),
          eq(associationMembers.organizationId, organizationId),
          isNull(associationMembers.deletedAt),
        ),
      );
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/members`);
  revalidatePath(`/${orgSlug}/members/${memberId}`);
  return { ok: true };
}

/**
 * Change le statut d'un membre (action ciblée, BLOC 3).
 *
 * Séparée de `updateMember` pour porter la seule logique métier du statut et de
 * `left_at` (schema-design §4.1). Multi-tenant strict, validation Zod du statut.
 */
export async function changeMemberStatus(
  orgSlug: string,
  memberId: string,
  raw: unknown,
): Promise<MemberActionResult> {
  const { organizationId } = await requireOrgAccess(orgSlug);

  const parsed = changeStatusServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const { status } = parsed.data;

  const [existing] = await db
    .select({ leftAt: associationMembers.leftAt })
    .from(associationMembers)
    .where(
      and(
        eq(associationMembers.id, memberId),
        eq(associationMembers.organizationId, organizationId),
        isNull(associationMembers.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) {
    return { ok: false, error: "notFound" };
  }

  try {
    await db
      .update(associationMembers)
      .set({ status, leftAt: computeLeftAt(status, existing.leftAt) })
      .where(
        and(
          eq(associationMembers.id, memberId),
          eq(associationMembers.organizationId, organizationId),
          isNull(associationMembers.deletedAt),
        ),
      );
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/members`);
  revalidatePath(`/${orgSlug}/members/${memberId}`);
  return { ok: true };
}

/**
 * Archive un membre (soft delete, BLOC 3).
 *
 * Aucun hard delete : on pose `deleted_at = NOW()`. L'historique (cotisations,
 * présences) référençant ce membre reste intact. Multi-tenant strict.
 */
export async function softDeleteMember(
  orgSlug: string,
  memberId: string,
): Promise<MemberActionResult> {
  const { organizationId } = await requireOrgAccess(orgSlug);

  let updated: { id: string } | undefined;
  try {
    [updated] = await db
      .update(associationMembers)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(associationMembers.id, memberId),
          eq(associationMembers.organizationId, organizationId),
          isNull(associationMembers.deletedAt),
        ),
      )
      .returning({ id: associationMembers.id });
  } catch {
    return { ok: false, error: "unknown" };
  }

  if (!updated) {
    return { ok: false, error: "notFound" };
  }

  revalidatePath(`/${orgSlug}/members`);
  return { ok: true };
}
