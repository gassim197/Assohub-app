import { CalendarDays, Video } from "lucide-react";
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

/** Une réunion, en carte (décision 6A : carte plutôt que ligne de table — contenu trop riche pour un tableau). */
function MeetingCard({
  meeting,
  locale,
  t,
}: {
  meeting: MeetingRow;
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const type = isMeetingType(meeting.type) ? meeting.type : null;
  const status = isMeetingStatus(meeting.status) ? meeting.status : null;

  const subline = [
    meeting.location,
    meeting.durationMinutes
      ? t("durationLabel", { minutes: meeting.durationMinutes })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 space-y-1.5">
          <p className="text-sm font-medium tabular-nums text-foreground">
            {formatMeetingDateTime(meeting.scheduledAt, locale)}
          </p>
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
          {subline ? (
            <p className="text-sm text-muted-foreground">{subline}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
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
  meetings,
  emptyTitle,
  emptyDescription,
}: {
  meetings: MeetingRow[];
  emptyTitle: string;
  emptyDescription: string;
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
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {meetings.map((meeting) => (
        <MeetingCard key={meeting.id} meeting={meeting} locale={locale} t={t} />
      ))}
    </div>
  );
}
