"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";

import { requireOrgAccess } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { associationMembers } from "@/lib/db/members-schema";
import { meetingAttendance, meetings } from "@/lib/db/meetings-schema";
import {
  updateMemberAttendanceServerSchema,
  updateMemberRsvpServerSchema,
} from "./attendance-schema";

export type AttendanceActionResult =
  | { ok: true }
  | { ok: false; error: "validation" | "notFound" | "unknown" };

/**
 * Vérifie que `meetingId` ET `memberId` appartiennent bien à `organizationId`
 * (garde multi-tenant additionnelle, au-delà de `requireOrgAccess`) : sans
 * cela, un `memberId` forgé d'une autre organisation pourrait s'attacher à une
 * réunion de cette organisation via l'upsert. Le membre doit en outre être
 * `actif` : les lignes historiques de membres archivés sont en lecture seule
 * (schema-design §6.4, décision session 6B), jamais réécrites depuis l'UI.
 */
async function assertMeetingAndActiveMemberInOrg(
  organizationId: string,
  meetingId: string,
  memberId: string,
): Promise<boolean> {
  const [meetingRow, memberRow] = await Promise.all([
    db
      .select({ id: meetings.id })
      .from(meetings)
      .where(
        and(
          eq(meetings.id, meetingId),
          eq(meetings.organizationId, organizationId),
          isNull(meetings.deletedAt),
        ),
      )
      .limit(1),
    db
      .select({ id: associationMembers.id })
      .from(associationMembers)
      .where(
        and(
          eq(associationMembers.id, memberId),
          eq(associationMembers.organizationId, organizationId),
          eq(associationMembers.status, "actif"),
          isNull(associationMembers.deletedAt),
        ),
      )
      .limit(1),
  ]);

  return Boolean(meetingRow[0]) && Boolean(memberRow[0]);
}

/**
 * Upsert du RSVP d'un membre pour une réunion (checkpoint 1). Aucune ligne
 * `meeting_attendance` n'existe forcément encore — création à la demande via
 * `onConflictDoUpdate` ciblant l'index unique partiel
 * `(meeting_id, member_id) WHERE deleted_at IS NULL`.
 */
export async function updateMemberRsvp(
  orgSlug: string,
  meetingId: string,
  raw: unknown,
): Promise<AttendanceActionResult> {
  const { organizationId } = await requireOrgAccess(orgSlug);

  const parsed = updateMemberRsvpServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const { memberId, rsvpStatus } = parsed.data;

  const allowed = await assertMeetingAndActiveMemberInOrg(
    organizationId,
    meetingId,
    memberId,
  );
  if (!allowed) {
    return { ok: false, error: "notFound" };
  }

  try {
    await db
      .insert(meetingAttendance)
      .values({
        id: newId(),
        organizationId,
        meetingId,
        memberId,
        rsvpStatus,
        rsvpAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [meetingAttendance.meetingId, meetingAttendance.memberId],
        targetWhere: sql`deleted_at IS NULL`,
        set: { rsvpStatus, rsvpAt: new Date() },
      });
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/meetings/${meetingId}`);
  return { ok: true };
}

/**
 * Upsert de la présence effective d'un membre pour une réunion (checkpoint
 * 1). Remplit `attendance_recorded_at` / `attendance_recorded_by_user_id` —
 * traçabilité de qui a saisi la présence, distincte du RSVP.
 */
export async function updateMemberAttendance(
  orgSlug: string,
  meetingId: string,
  raw: unknown,
): Promise<AttendanceActionResult> {
  const { organizationId, userId } = await requireOrgAccess(orgSlug);

  const parsed = updateMemberAttendanceServerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const { memberId, attended } = parsed.data;

  const allowed = await assertMeetingAndActiveMemberInOrg(
    organizationId,
    meetingId,
    memberId,
  );
  if (!allowed) {
    return { ok: false, error: "notFound" };
  }

  const now = new Date();
  try {
    await db
      .insert(meetingAttendance)
      .values({
        id: newId(),
        organizationId,
        meetingId,
        memberId,
        attended,
        attendanceRecordedAt: now,
        attendanceRecordedByUserId: userId,
      })
      .onConflictDoUpdate({
        target: [meetingAttendance.meetingId, meetingAttendance.memberId],
        targetWhere: sql`deleted_at IS NULL`,
        set: {
          attended,
          attendanceRecordedAt: now,
          attendanceRecordedByUserId: userId,
        },
      });
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${orgSlug}/meetings/${meetingId}`);
  return { ok: true };
}
