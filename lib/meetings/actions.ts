"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { requireOrgAccess } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { meetings } from "@/lib/db/meetings-schema";
import { parseDatetimeLocalAsUtc } from "./date";
import { changeMeetingStatusServerSchema, meetingServerSchema } from "./schema";

/**
 * Résultat des Server Actions de réunion (patron `MemberActionResult` /
 * `CotisationTypeActionResult`). Aucune permission fine en V1 (décision
 * produit) : tout utilisateur authentifié de l'org peut créer/éditer.
 */
export type MeetingActionResult =
  | { ok: true; meetingId: string }
  | { ok: false; error: "validation" | "notFound" | "unknown" };

/** Résultat des actions ciblées (statut, suppression) sans champ de formulaire. */
export type MeetingStatusActionResult =
  | { ok: true }
  | { ok: false; error: "validation" | "notFound" | "unknown" };

/**
 * Crée une réunion (session 6A §4). Multi-tenant strict via
 * `requireOrgAccess`. `scheduledAt` (format `datetime-local` brut) est
 * converti en `Date` UTC avant l'écriture — Africa/Conakry est GMT+0 toute
 * l'année, donc aucune conversion arithmétique n'est nécessaire (cf.
 * `lib/meetings/date.ts`).
 */
export async function createMeeting(
  orgSlug: string,
  raw: unknown,
): Promise<MeetingActionResult> {
  const { organizationId, userId } = await requireOrgAccess(orgSlug);

  const parsed = meetingServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  const meetingId = newId();
  try {
    await db.insert(meetings).values({
      id: meetingId,
      organizationId,
      createdByUserId: userId,
      title: data.title,
      type: data.type,
      description: data.description ?? null,
      scheduledAt: parseDatetimeLocalAsUtc(data.scheduledAt),
      durationMinutes: data.durationMinutes ?? null,
      location: data.location ?? null,
      videoLink: data.videoLink ?? null,
      status: data.status,
    });
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/meetings`);
  return { ok: true, meetingId };
}

/**
 * Met à jour une réunion existante. Multi-tenant strict : toutes les
 * écritures sont bornées à `(id, organizationId, deleted_at IS NULL)`, un
 * `meetingId` d'une autre organisation est traité comme introuvable.
 */
export async function updateMeeting(
  orgSlug: string,
  meetingId: string,
  raw: unknown,
): Promise<MeetingActionResult> {
  const { organizationId } = await requireOrgAccess(orgSlug);

  const parsed = meetingServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  try {
    const [updated] = await db
      .update(meetings)
      .set({
        title: data.title,
        type: data.type,
        description: data.description ?? null,
        scheduledAt: parseDatetimeLocalAsUtc(data.scheduledAt),
        durationMinutes: data.durationMinutes ?? null,
        location: data.location ?? null,
        videoLink: data.videoLink ?? null,
        status: data.status,
      })
      .where(
        and(
          eq(meetings.id, meetingId),
          eq(meetings.organizationId, organizationId),
          isNull(meetings.deletedAt),
        ),
      )
      .returning({ id: meetings.id });

    if (!updated) {
      return { ok: false, error: "notFound" };
    }
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/meetings`);
  revalidatePath(`/${orgSlug}/meetings/${meetingId}`);
  return { ok: true, meetingId };
}

/**
 * Change le statut d'une réunion (action ciblée, checkpoint 3). Séparée de
 * `updateMeeting` pour porter la seule logique de statut — la confirmation
 * pour un passage à « annulée » vit côté UI (`MeetingStatusDialog`). Multi-tenant
 * strict, validation Zod du statut.
 */
export async function changeMeetingStatus(
  orgSlug: string,
  meetingId: string,
  raw: unknown,
): Promise<MeetingStatusActionResult> {
  const { organizationId } = await requireOrgAccess(orgSlug);

  const parsed = changeMeetingStatusServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const { status } = parsed.data;

  try {
    const [updated] = await db
      .update(meetings)
      .set({ status })
      .where(
        and(
          eq(meetings.id, meetingId),
          eq(meetings.organizationId, organizationId),
          isNull(meetings.deletedAt),
        ),
      )
      .returning({ id: meetings.id });

    if (!updated) {
      return { ok: false, error: "notFound" };
    }
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/meetings`);
  revalidatePath(`/${orgSlug}/meetings/${meetingId}`);
  return { ok: true };
}

/**
 * Supprime (soft delete) une réunion. Aucun hard delete : on pose
 * `deleted_at = NOW()`, la ligne reste en base. Multi-tenant strict.
 */
export async function softDeleteMeeting(
  orgSlug: string,
  meetingId: string,
): Promise<MeetingStatusActionResult> {
  const { organizationId } = await requireOrgAccess(orgSlug);

  let updated: { id: string } | undefined;
  try {
    [updated] = await db
      .update(meetings)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(meetings.id, meetingId),
          eq(meetings.organizationId, organizationId),
          isNull(meetings.deletedAt),
        ),
      )
      .returning({ id: meetings.id });
  } catch {
    return { ok: false, error: "unknown" };
  }

  if (!updated) {
    return { ok: false, error: "notFound" };
  }

  revalidatePath(`/${orgSlug}/meetings`);
  return { ok: true };
}
