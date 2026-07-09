"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { requireOrgAccess } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { cotisationTypes } from "@/lib/db/cotisations-schema";
import { gnfToCentimes } from "@/lib/currency";
import { cotisationTypeServerSchema } from "./schema";

/** Résultat des actions sur les types de cotisation (patron `MemberActionResult`). */
export type CotisationTypeActionResult =
  | { ok: true }
  | { ok: false; error: "validation" | "notFound" | "unknown" };

/**
 * Crée un type de cotisation (schema-design §5.1).
 *
 * Multi-tenancy : `requireOrgAccess` fournit l'`organizationId` de confiance.
 * `defaultAmount` est saisi en unités GNF par le formulaire, converti en
 * centimes ici avant stockage (jamais de float/decimal en base).
 */
export async function createCotisationType(
  orgSlug: string,
  raw: unknown,
): Promise<CotisationTypeActionResult> {
  const { organizationId } = await requireOrgAccess(orgSlug);

  const parsed = cotisationTypeServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  try {
    await db.insert(cotisationTypes).values({
      id: newId(),
      organizationId,
      name: data.name,
      description: data.description ?? null,
      defaultAmount: gnfToCentimes(data.defaultAmount),
      frequency: data.frequency,
      autoGenerate: data.autoGenerate,
      isActive: data.isActive,
    });
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/cotisations`);
  return { ok: true };
}

/**
 * Met à jour un type de cotisation existant.
 *
 * Ne touche jamais aux cotisations déjà générées : `due_amount` a été copié
 * depuis `default_amount` au moment de la génération et n'est plus lié au
 * type par la suite (décision confirmée avec le fondateur, session 5A).
 */
export async function updateCotisationType(
  orgSlug: string,
  typeId: string,
  raw: unknown,
): Promise<CotisationTypeActionResult> {
  const { organizationId } = await requireOrgAccess(orgSlug);

  const parsed = cotisationTypeServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  try {
    const [updated] = await db
      .update(cotisationTypes)
      .set({
        name: data.name,
        description: data.description ?? null,
        defaultAmount: gnfToCentimes(data.defaultAmount),
        frequency: data.frequency,
        autoGenerate: data.autoGenerate,
        isActive: data.isActive,
      })
      .where(
        and(
          eq(cotisationTypes.id, typeId),
          eq(cotisationTypes.organizationId, organizationId),
          isNull(cotisationTypes.deletedAt),
        ),
      )
      .returning({ id: cotisationTypes.id });

    if (!updated) {
      return { ok: false, error: "notFound" };
    }
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/cotisations`);
  return { ok: true };
}

/**
 * Archive un type de cotisation (soft delete).
 *
 * Il disparaît de la liste et de la génération future, mais les cotisations
 * passées gardent leur FK vers ce type (jamais de hard delete, schema-design §1.4).
 */
export async function archiveCotisationType(
  orgSlug: string,
  typeId: string,
): Promise<CotisationTypeActionResult> {
  const { organizationId } = await requireOrgAccess(orgSlug);

  let updated: { id: string } | undefined;
  try {
    [updated] = await db
      .update(cotisationTypes)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(cotisationTypes.id, typeId),
          eq(cotisationTypes.organizationId, organizationId),
          isNull(cotisationTypes.deletedAt),
        ),
      )
      .returning({ id: cotisationTypes.id });
  } catch {
    return { ok: false, error: "unknown" };
  }

  if (!updated) {
    return { ok: false, error: "notFound" };
  }

  revalidatePath(`/${orgSlug}/cotisations`);
  return { ok: true };
}
