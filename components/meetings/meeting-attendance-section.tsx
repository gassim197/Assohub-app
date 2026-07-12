import { getMeetingAttendance } from "@/lib/meetings/attendance-queries";
import { canRecordAttendance, canRecordRsvp } from "@/lib/meetings/constants";
import { MeetingAttendanceList } from "./meeting-attendance-list";

/**
 * Server Component : charge l'état de présence (jointure membres actifs +
 * `meeting_attendance`) et calcule les règles d'accès aux contrôles (RSVP
 * bloqué seulement si `annulee`, présence bloquée si `annulee` ou réunion
 * future) avant de les passer à la liste éditable côté client.
 */
export async function MeetingAttendanceSection({
  orgSlug,
  organizationId,
  meetingId,
  meetingStatus,
  meetingScheduledAt,
}: {
  orgSlug: string;
  organizationId: string;
  meetingId: string;
  meetingStatus: string;
  meetingScheduledAt: Date;
}) {
  const members = await getMeetingAttendance(organizationId, meetingId);

  const rsvpDisabled = !canRecordRsvp(meetingStatus);
  const attendanceDisabled = !canRecordAttendance(meetingStatus, meetingScheduledAt);
  const attendanceDisabledReason: "cancelled" | "future" | null =
    meetingStatus === "annulee" ? "cancelled" : attendanceDisabled ? "future" : null;

  return (
    <MeetingAttendanceList
      orgSlug={orgSlug}
      meetingId={meetingId}
      members={members}
      rsvpDisabled={rsvpDisabled}
      attendanceDisabled={attendanceDisabled}
      attendanceDisabledReason={attendanceDisabledReason}
    />
  );
}
