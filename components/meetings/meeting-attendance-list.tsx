"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  updateMemberAttendance,
  updateMemberRsvp,
} from "@/lib/meetings/attendance-actions";
import type { MemberAttendanceRow } from "@/lib/meetings/attendance-queries";
import { RSVP_STATUSES, type RsvpStatus } from "@/lib/meetings/constants";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";

/** Initiales (1 à 2 lettres) pour le fallback d'avatar (même patron que la fiche membre). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? "";
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

interface AttendanceRowProps {
  orgSlug: string;
  meetingId: string;
  member: MemberAttendanceRow;
  rsvpDisabled: boolean;
  attendanceDisabled: boolean;
}

/**
 * Ligne d'un membre actif : RSVP + présence, auto-save optimiste par champ.
 * En cas d'échec, l'état local revient visiblement à sa valeur précédente
 * (le contrôle "se dé-coche" / le select reprend son ancienne valeur) et un
 * toast nomme le membre concerné — le secrétaire ne doit jamais croire
 * qu'une saisie a été enregistrée alors qu'elle a échoué (décision 6B).
 */
function AttendanceRow({
  orgSlug,
  meetingId,
  member,
  rsvpDisabled,
  attendanceDisabled,
}: AttendanceRowProps) {
  const t = useTranslations("meetings.attendance");
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>(member.rsvpStatus);
  const [attended, setAttended] = useState<boolean | null>(member.attended);
  const [isRsvpPending, startRsvpTransition] = useTransition();
  const [isAttendancePending, startAttendanceTransition] = useTransition();

  function handleRsvpChange(value: RsvpStatus) {
    const previous = rsvpStatus;
    setRsvpStatus(value);
    startRsvpTransition(async () => {
      const result = await updateMemberRsvp(orgSlug, meetingId, {
        memberId: member.memberId,
        rsvpStatus: value,
      });
      if (!result.ok) {
        setRsvpStatus(previous);
        toast.error(t("saveErrorRsvp", { name: member.fullName }));
      }
    });
  }

  function handleAttendanceChange(checked: boolean) {
    const previous = attended;
    setAttended(checked);
    startAttendanceTransition(async () => {
      const result = await updateMemberAttendance(orgSlug, meetingId, {
        memberId: member.memberId,
        attended: checked,
      });
      if (!result.ok) {
        setAttended(previous);
        toast.error(t("saveErrorAttendance", { name: member.fullName }));
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2.5">
        <Avatar size="sm">
          <AvatarFallback>{initials(member.fullName)}</AvatarFallback>
        </Avatar>
        <span className="text-sm text-foreground">{member.fullName}</span>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-1.5">
          <Select
            value={rsvpStatus}
            onValueChange={(value) => handleRsvpChange(value as RsvpStatus)}
            disabled={rsvpDisabled || isRsvpPending}
          >
            <SelectTrigger size="sm" className="w-36" aria-label={t("columnRsvp")}>
              <SelectValue>
                {(value: string | null) => t(`rsvp.${(value ?? "no_response") as RsvpStatus}`)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {RSVP_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`rsvp.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isRsvpPending ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        <div
          className="flex items-center gap-1.5"
          title={attendanceDisabled ? t("presentFutureHint") : undefined}
        >
          <Switch
            checked={attended === true}
            onCheckedChange={handleAttendanceChange}
            disabled={attendanceDisabled || isAttendancePending}
            aria-label={t("columnPresent")}
          />
          {isAttendancePending ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Ligne d'un membre archivé (statut non-actif ou fiche supprimée) ayant une présence historique pour cette réunion : affichage seul, aucune saisie possible. */
function ArchivedAttendanceRow({ member }: { member: MemberAttendanceRow }) {
  const t = useTranslations("meetings.attendance");

  const attendedLabel =
    member.attended === true
      ? t("attendedYes")
      : member.attended === false
        ? t("attendedNo")
        : t("attendedUnknown");

  return (
    <div className="flex flex-col gap-3 p-3 opacity-70 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2.5">
        <Avatar size="sm">
          <AvatarFallback>{initials(member.fullName)}</AvatarFallback>
        </Avatar>
        <span className="text-sm text-foreground">{member.fullName}</span>
        <Badge variant="outline">{t("archivedBadge")}</Badge>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <Badge variant="outline">{t(`rsvp.${member.rsvpStatus}`)}</Badge>
        <Badge variant="outline">{attendedLabel}</Badge>
      </div>
    </div>
  );
}

export interface MeetingAttendanceListProps {
  orgSlug: string;
  meetingId: string;
  members: MemberAttendanceRow[];
  rsvpDisabled: boolean;
  attendanceDisabled: boolean;
  attendanceDisabledReason: "cancelled" | "future" | null;
}

/**
 * Liste éditable de présence (checkpoint 1) : tous les membres actifs de
 * l'organisation, plus les membres archivés ayant une présence historique
 * pour cette réunion (lecture seule, en bas de liste). Recherche
 * client-side — volume attendu faible pour une association (même décision
 * que le calendrier en 6A, cf. `listMeetingDatesForCalendar`).
 */
export function MeetingAttendanceList({
  orgSlug,
  meetingId,
  members,
  rsvpDisabled,
  attendanceDisabled,
  attendanceDisabledReason,
}: MeetingAttendanceListProps) {
  const t = useTranslations("meetings.attendance");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return members;
    return members.filter((member) =>
      member.fullName.toLowerCase().includes(term),
    );
  }, [members, search]);

  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noActiveMembers")}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="pl-8 sm:max-w-xs"
        />
      </div>

      {attendanceDisabledReason ? (
        <p className="text-xs text-muted-foreground">
          {attendanceDisabledReason === "cancelled"
            ? t("cancelledHint")
            : t("presentFutureHint")}
        </p>
      ) : null}

      <div className="divide-y divide-border rounded-lg border border-border">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          filtered.map((member) =>
            member.isArchived ? (
              <ArchivedAttendanceRow key={member.memberId} member={member} />
            ) : (
              <AttendanceRow
                key={member.memberId}
                orgSlug={orgSlug}
                meetingId={meetingId}
                member={member}
                rsvpDisabled={rsvpDisabled}
                attendanceDisabled={attendanceDisabled}
              />
            ),
          )
        )}
      </div>
    </div>
  );
}
