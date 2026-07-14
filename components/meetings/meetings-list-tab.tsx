import Link from "next/link";
import { CalendarDays, Clock, MapPin, Plus, Video } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import {
  MEETING_STATUS_BADGE_VARIANT,
  MEETING_TYPE_BADGE_VARIANT,
  isMeetingStatus,
  isMeetingType,
} from "@/lib/meetings/constants";
import { formatMeetingDateTime } from "@/lib/meetings/date";
import type { MeetingRow } from "@/lib/meetings/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MeetingRowActions } from "./meeting-row-actions";

/**
 * Bloc date façon calendrier (jour en gros + mois abrégé), ancrage visuel de
 * la carte (session 6.5, purement présentationnel). Calculé en UTC, cohérent
 * avec `formatMeetingDateTime` (Africa/Conakry = UTC toute l'année, cf.
 * `lib/meetings/date.ts`).
 */
function MeetingDateBadge({ date, locale }: { date: Date; locale: string }) {
  const day = new Intl.DateTimeFormat(locale, { day: "2-digit", timeZone: "UTC" }).format(
    date,
  );
  const month = new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: "UTC",
  })
    .format(date)
    .replace(".", "")
    .toUpperCase();

  return (
    <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
      <span className="text-lg leading-none font-semibold tabular-nums">{day}</span>
      <span className="mt-0.5 text-[0.65rem] leading-none font-medium tracking-wide">
        {month}
      </span>
    </div>
  );
}

/** Une réunion, en carte (décision 6A : carte plutôt que ligne de table — contenu trop riche pour un tableau). */
function MeetingCard({
  orgSlug,
  meeting,
  locale,
  t,
}: {
  orgSlug: string;
  meeting: MeetingRow;
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const type = isMeetingType(meeting.type) ? meeting.type : null;
  const status = isMeetingStatus(meeting.status) ? meeting.status : null;

  return (
    <Card className="transition-colors hover:bg-muted/40">
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-4">
          <MeetingDateBadge date={meeting.scheduledAt} locale={locale} />

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">
                {meeting.title}
              </h3>
              <Badge variant={type ? MEETING_TYPE_BADGE_VARIANT[type] : "outline"}>
                {type ? t(`types.${type}`) : meeting.type}
              </Badge>
              <Badge
                variant={status ? MEETING_STATUS_BADGE_VARIANT[status] : "outline"}
              >
                {status ? t(`status.${status}`) : meeting.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatMeetingDateTime(meeting.scheduledAt, locale)}
            </p>
            {meeting.location || meeting.durationMinutes ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {meeting.location ? (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {meeting.location}
                  </span>
                ) : null}
                {meeting.durationMinutes ? (
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    {t("durationLabel", { minutes: meeting.durationMinutes })}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
          {meeting.videoLink ? (
            <Button
              variant="outline"
              size="sm"
              render={
                <a href={meeting.videoLink} target="_blank" rel="noopener noreferrer" />
              }
            >
              <Video />
              {t("join")}
            </Button>
          ) : null}
          <MeetingRowActions
            orgSlug={orgSlug}
            meeting={{ id: meeting.id, title: meeting.title, status: meeting.status }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Contenu d'un onglet de la liste des réunions (checkpoint 1, session 6A) —
 * réutilisé par "Prochaines réunions" et "Réunions passées". Server
 * Component : la liste est déjà filtrée/chargée par la page parente selon la
 * règle stricte correspondante.
 */
export async function MeetingsListTab({
  orgSlug,
  meetings,
  emptyTitle,
  emptyDescription,
  showCreateCta,
}: {
  orgSlug: string;
  meetings: MeetingRow[];
  emptyTitle: string;
  emptyDescription: string;
  showCreateCta?: boolean;
}) {
  const [t, locale] = await Promise.all([
    getTranslations("meetings"),
    getLocale(),
  ]);

  if (meetings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-6 rounded-full bg-primary/10 p-4">
            <CalendarDays className="size-10 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">{emptyTitle}</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {emptyDescription}
          </p>
          {showCreateCta ? (
            <Button
              className="mt-6"
              render={<Link href={`/${orgSlug}/meetings?newMeeting=true`} />}
            >
              <Plus />
              {t("empty.cta")}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {meetings.map((meeting) => (
        <MeetingCard
          key={meeting.id}
          orgSlug={orgSlug}
          meeting={meeting}
          locale={locale}
          t={t}
        />
      ))}
    </div>
  );
}
