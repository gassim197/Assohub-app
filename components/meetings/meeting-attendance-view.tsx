"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { bulkUpdateAttendance } from "@/lib/meetings/attendance-actions";
import type { MemberAttendanceRow } from "@/lib/meetings/attendance-queries";
import { RSVP_STATUSES, type RsvpStatus } from "@/lib/meetings/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { MeetingAttendanceList } from "./meeting-attendance-list";

/** Pastille RSVP colorée + libellé + compteur (présentation uniquement). */
const RSVP_DOT_CLASSNAME: Record<RsvpStatus, string> = {
  yes: "bg-success",
  no: "bg-destructive",
  maybe: "bg-warning",
  no_response: "bg-muted-foreground/40",
};

export interface MeetingAttendanceViewProps {
  orgSlug: string;
  meetingId: string;
  initialMembers: MemberAttendanceRow[];
  rsvpDisabled: boolean;
  attendanceDisabled: boolean;
  attendanceDisabledReason: "cancelled" | "future" | null;
}

/**
 * Racine cliente de la section « Présence » (checkpoint 2). Possède l'état
 * des membres (seule source de vérité) pour que le compteur synthétique se
 * mette à jour en temps réel à chaque saisie individuelle ou groupée, sans
 * dépendre d'un `router.refresh()` — l'auto-save reste silencieuse
 * (§4 de la session : pas de rechargement bloquant).
 */
export function MeetingAttendanceView({
  orgSlug,
  meetingId,
  initialMembers,
  rsvpDisabled,
  attendanceDisabled,
  attendanceDisabledReason,
}: MeetingAttendanceViewProps) {
  const t = useTranslations("meetings.attendance");
  const [members, setMembers] = useState(initialMembers);
  const [managing, setManaging] = useState(false);
  const [isBulkPending, startBulkTransition] = useTransition();

  const activeMembers = useMemo(
    () => members.filter((member) => !member.isArchived),
    [members],
  );
  const total = activeMembers.length;
  const presentCount = useMemo(
    () => activeMembers.filter((member) => member.attended === true).length,
    [activeMembers],
  );
  const percent = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  const rsvpCounts = useMemo(() => {
    const counts: Record<RsvpStatus, number> = {
      yes: 0,
      no: 0,
      maybe: 0,
      no_response: 0,
    };
    for (const member of activeMembers) {
      counts[member.rsvpStatus] += 1;
    }
    return counts;
  }, [activeMembers]);
  const hasRsvps = rsvpCounts.yes + rsvpCounts.no + rsvpCounts.maybe > 0;

  function handleMemberChange(memberId: string, patch: Partial<MemberAttendanceRow>) {
    setMembers((prev) =>
      prev.map((member) =>
        member.memberId === memberId ? { ...member, ...patch } : member,
      ),
    );
  }

  function handleBulkAttendance(attended: boolean) {
    if (activeMembers.length === 0) return;

    const previous = members;
    const targets = activeMembers.map((member) => ({
      memberId: member.memberId,
      attended,
    }));

    setMembers((prev) =>
      prev.map((member) => (member.isArchived ? member : { ...member, attended })),
    );

    startBulkTransition(async () => {
      const result = await bulkUpdateAttendance(orgSlug, meetingId, {
        updates: targets,
      });
      if (!result.ok) {
        setMembers(previous);
        toast.error(t("bulkSaveError"));
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {total > 0 ? (
              <div className="flex flex-1 items-center gap-4">
                <p className="text-3xl font-semibold tabular-nums text-foreground">
                  {percent}%
                </p>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Progress value={percent} />
                  <p className="text-sm text-muted-foreground">
                    {t("summary.presentCount", { present: presentCount, total })}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noActiveMembers")}</p>
            )}

            {total > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setManaging((value) => !value)}
              >
                {managing ? t("hide") : t("manage")}
              </Button>
            ) : null}
          </div>

          {hasRsvps ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {RSVP_STATUSES.map((rsvpStatus) => (
                <span key={rsvpStatus} className="flex items-center gap-1.5">
                  <span
                    className={cn("size-2 rounded-full", RSVP_DOT_CLASSNAME[rsvpStatus])}
                  />
                  {rsvpCounts[rsvpStatus]} {t(`rsvp.${rsvpStatus}`)}
                </span>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {managing ? (
        <MeetingAttendanceList
          orgSlug={orgSlug}
          meetingId={meetingId}
          members={members}
          rsvpDisabled={rsvpDisabled}
          attendanceDisabled={attendanceDisabled}
          attendanceDisabledReason={attendanceDisabledReason}
          onMemberChange={handleMemberChange}
          onBulkAttendance={handleBulkAttendance}
          isBulkPending={isBulkPending}
        />
      ) : null}
    </div>
  );
}
