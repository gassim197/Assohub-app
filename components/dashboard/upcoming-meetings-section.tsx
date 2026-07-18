import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import type { MeetingRow } from "@/lib/meetings/queries";
import { MEETING_TYPE_BADGE_VARIANT, isMeetingType } from "@/lib/meetings/constants";
import { formatMeetingDateTime } from "@/lib/meetings/date";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const PREVIEW_COUNT = 3;

/**
 * Section "Prochaines réunions" du tableau de bord (checkpoint 2, session
 * 8A) : aperçu des 2-3 réunions à venir les plus proches. `meetings` est la
 * même liste déjà chargée pour la KPI "Prochaine réunion" (checkpoint 1,
 * `listUpcomingMeetings`) — tronquée ici, aucun nouvel appel. Titre + lien
 * au-dessus de la `Card` (même patron que `overview-tab.tsx`, ni `CardHeader`
 * ni `CardTitle` : inutilisés ailleurs dans l'app).
 */
export async function UpcomingMeetingsSection({
  orgSlug,
  meetings,
}: {
  orgSlug: string;
  meetings: MeetingRow[];
}) {
  const [t, tMeetingTypes, locale] = await Promise.all([
    getTranslations("dashboard.overview.activity.meetings"),
    getTranslations("meetings.types"),
    getLocale(),
  ]);

  const preview = meetings.slice(0, PREVIEW_COUNT);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">{t("title")}</h2>
        <Link
          href={`/${orgSlug}/meetings`}
          className="flex items-center gap-0.5 text-sm font-medium text-primary hover:underline"
        >
          {t("viewAll")}
          <ChevronRight className="size-3.5" />
        </Link>
      </div>

      <Card>
        <CardContent>
          {preview.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarDays className="mb-2 size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {preview.map((meeting) => {
                const type = isMeetingType(meeting.type) ? meeting.type : null;
                return (
                  <li
                    key={meeting.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {meeting.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatMeetingDateTime(meeting.scheduledAt, locale)}
                      </p>
                    </div>
                    <Badge variant={type ? MEETING_TYPE_BADGE_VARIANT[type] : "outline"}>
                      {type ? tMeetingTypes(type) : meeting.type}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
