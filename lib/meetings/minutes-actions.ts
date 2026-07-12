"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, ne } from "drizzle-orm";

import { requireOrgAccess } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { minutes, meetings } from "@/lib/db/meetings-schema";
import { minutesServerSchema } from "./minutes-schema";

export type MinutesActionResult =
  | { ok: true; minutesId: string }
  | { ok: false; error: "validation" | "notFound" | "conflict" | "unknown" };

/**
 * Crée le PV d'une réunion (checkpoint 1). Multi-tenant strict : vérifie que
 * la réunion appartient à l'org avant toute écriture. Refuse la création si
 * un PV non-archivé existe déjà pour cette réunion (règle schema-design
 * §6.5 : au plus un PV non-archivé par réunion) — l'appelant doit éditer
 * l'existant, ou l'archiver d'abord (checkpoint 2) pour en recréer un.
 */
export async function createMinutes(
  orgSlug: string,
  meetingId: string,
  raw: unknown,
): Promise<MinutesActionResult> {
  const { organizationId, userId } = await requireOrgAccess(orgSlug);

  const parsed = minutesServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  const [meeting] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(
      and(
        eq(meetings.id, meetingId),
        eq(meetings.organizationId, organizationId),
        isNull(meetings.deletedAt),
      ),
    )
    .limit(1);
  if (!meeting) {
    return { ok: false, error: "notFound" };
  }

  const [existingActive] = await db
    .select({ id: minutes.id })
    .from(minutes)
    .where(
      and(
        eq(minutes.meetingId, meetingId),
        eq(minutes.organizationId, organizationId),
        isNull(minutes.deletedAt),
        ne(minutes.status, "archive"),
      ),
    )
    .limit(1);
  if (existingActive) {
    return { ok: false, error: "conflict" };
  }

  const minutesId = newId();
  try {
    await db.insert(minutes).values({
      id: minutesId,
      organizationId,
      meetingId,
      createdByUserId: userId,
      agenda: data.agenda ?? null,
      decisionsSummary: data.decisionsSummary ?? null,
      actionsToFollow: data.actionsToFollow ?? null,
      bodyMarkdown: data.bodyMarkdown,
    });
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/meetings/${meetingId}`);
  return { ok: true, minutesId };
}

/**
 * Met à jour le contenu d'un PV existant (checkpoint 1). Autorisé quel que
 * soit le statut, y compris publié (schema-design §6.5 : « modification
 * après publication autorisée, pas de versioning en V1 »). Multi-tenant
 * strict.
 */
export async function updateMinutes(
  orgSlug: string,
  minutesId: string,
  raw: unknown,
): Promise<MinutesActionResult> {
  const { organizationId } = await requireOrgAccess(orgSlug);

  const parsed = minutesServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  try {
    const [updated] = await db
      .update(minutes)
      .set({
        agenda: data.agenda ?? null,
        decisionsSummary: data.decisionsSummary ?? null,
        actionsToFollow: data.actionsToFollow ?? null,
        bodyMarkdown: data.bodyMarkdown,
      })
      .where(
        and(
          eq(minutes.id, minutesId),
          eq(minutes.organizationId, organizationId),
          isNull(minutes.deletedAt),
        ),
      )
      .returning({ id: minutes.id, meetingId: minutes.meetingId });

    if (!updated) {
      return { ok: false, error: "notFound" };
    }

    revalidatePath(`/${orgSlug}/meetings/${updated.meetingId}`);
    return { ok: true, minutesId: updated.id };
  } catch {
    return { ok: false, error: "unknown" };
  }
}
