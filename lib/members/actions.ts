"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { requireOrgAccess } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { associationMembers } from "@/lib/db/members-schema";
import { toE164 } from "@/lib/phone";
import { EXIT_STATUSES } from "./constants";
import { createMemberServerSchema } from "./schema";

export type CreateMemberResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "emailTaken" | "phoneInvalid" | "unknown";
      field?: "email" | "phoneNumber";
    };

/** Date du jour au format `YYYY-MM-DD` (colonnes `date` du schéma). */
function today(): string {
  return new Date().toISOString().slice(0, 10);
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

  // schema-design §4.1 : un statut de sortie remplit `left_at` dès la création.
  const isExit = EXIT_STATUSES.includes(data.status);

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
      leftAt: isExit ? today() : null,
    });
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/members`);
  return { ok: true };
}
