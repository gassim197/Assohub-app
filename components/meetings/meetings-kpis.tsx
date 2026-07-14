import { getLocale, getTranslations } from "next-intl/server";

import type { MeetingRow } from "@/lib/meetings/queries";
import { formatMeetingDateTime } from "@/lib/meetings/date";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Bandeau de KPI (session 6.5, purement présentationnel) : agrégation à
 * l'affichage à partir des listes déjà chargées par la page — `upcoming` et
 * `past` proviennent des mêmes fonctions de requête que les onglets
 * (`listUpcomingMeetings`/`listPastMeetings`), appelées ici sans le filtre
 * `day` pour que ces compteurs restent globaux même quand le calendrier a
 * une date sélectionnée (additive uniquement sur les onglets, jamais sur ce
 * bandeau). Aucune nouvelle règle métier : `upcoming`/`past` appliquent déjà
 * le filtrage strict habituel (schema-design §6.1).
 */
export async function MeetingsKpis({
  upcoming,
  past,
}: {
  upcoming: MeetingRow[];
  past: MeetingRow[];
}) {
  const [t, locale] = await Promise.all([
    getTranslations("meetings.kpis"),
    getLocale(),
  ]);

  const currentYear = new Date().getUTCFullYear();
  const heldThisYearCount = past.filter(
    (meeting) => meeting.scheduledAt.getUTCFullYear() === currentYear,
  ).length;
  const nextMeeting = upcoming[0] ?? null;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card size="sm">
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("upcoming")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {upcoming.length}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("heldThisYear")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {heldThisYearCount}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("nextMeeting")}</p>
          {nextMeeting ? (
            <>
              <p className="mt-1 truncate text-base font-semibold text-foreground">
                {nextMeeting.title}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatMeetingDateTime(nextMeeting.scheduledAt, locale)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{t("noneScheduled")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
