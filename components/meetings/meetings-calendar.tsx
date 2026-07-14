"use client";

import type { ComponentProps } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { enUS, fr } from "date-fns/locale";
import type { DayButton } from "react-day-picker";

import { parseLocalDateKey, toLocalDateKey } from "@/lib/meetings/date";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";

/**
 * Bouton de jour custom (checkpoint 2, session 6A) : reprend le style de
 * `CalendarDayButton` (`components/ui/calendar.tsx`) et ajoute une pastille
 * sous le numéro pour les jours ayant au moins une réunion visible.
 * `children` (le numéro du jour, fourni par react-day-picker) est extrait
 * explicitement puis réinjecté à côté de la pastille — un `{...props}` seul
 * écraserait ce children au lieu de le compléter.
 */
function MeetingDayButton({
  className,
  day,
  modifiers,
  children,
  ...props
}: ComponentProps<typeof DayButton>) {
  return (
    <Button
      variant="ghost"
      size="icon"
      data-day={day.date.toISOString()}
      data-selected-single={modifiers.selected}
      className={cn(
        "relative flex aspect-square size-auto w-full min-w-(--cell-size) flex-col items-center justify-center gap-0.5 border-0 font-normal data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground",
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {modifiers.hasMeeting ? (
        <span
          className={cn(
            "absolute bottom-1 size-1 rounded-full bg-primary",
            modifiers.selected && "bg-primary-foreground",
          )}
        />
      ) : null}
    </Button>
  );
}

/**
 * Panneau calendrier interactif (checkpoint 2, session 6A). Bâti sur
 * `react-day-picker` (base du `Calendar` shadcn déjà installé) plutôt qu'une
 * nouvelle librairie ou du fait-main complet : navigation de mois et mise en
 * évidence du jour courant déjà natives, seul le marquage des jours et le
 * clic-pour-filtrer sont ajoutés ici.
 *
 * Pas de re-fetch au changement de mois : `dates` (toutes les réunions
 * visibles de l'organisation, hors `annulee`) est chargé une fois par la page
 * parente — volume attendu faible pour une association (décision confirmée
 * checkpoint 1). Le clic sur un jour ajoute `?day=YYYY-MM-DD` à l'URL, additif
 * au filtrage strict des deux onglets, jamais un remplacement.
 */
export function MeetingsCalendar({ dates }: { dates: string[] }) {
  const t = useTranslations("meetings.calendar");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentDay = searchParams.get("day");
  const selected = currentDay ? parseLocalDateKey(currentDay) : undefined;
  const meetingDates = dates.map(parseLocalDateKey);

  function goToDay(date: Date | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (date) {
      params.set("day", toLocalDateKey(date));
    } else {
      params.delete("day");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function showAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("day");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="w-fit space-y-3">
      <h2 className="text-sm font-medium text-foreground">{t("title")}</h2>
      <Card className="w-fit p-4">
        <Calendar
          mode="single"
          locale={locale.startsWith("fr") ? fr : enUS}
          selected={selected}
          onSelect={goToDay}
          modifiers={{ hasMeeting: meetingDates }}
          components={{ DayButton: MeetingDayButton }}
        />
        {currentDay ? (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            onClick={showAll}
          >
            {t("showAll")}
          </Button>
        ) : null}
      </Card>
    </div>
  );
}
