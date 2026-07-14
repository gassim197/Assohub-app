/**
 * Utilitaires de période — purs, sans dépendance à `db` (même précaution que
 * `lib/cotisations/period.ts` : ce module est importé par des Client
 * Components pour les filtres, jamais par un module qui importerait `db`).
 *
 * Calcul en UTC : Africa/Conakry est GMT+0 toute l'année (pas de DST).
 */

export const REPORTS_PERIOD_OPTIONS = ["last30days", "thisYear", "custom"] as const;

export type ReportsPeriodOption = (typeof REPORTS_PERIOD_OPTIONS)[number];

export const DEFAULT_REPORTS_PERIOD: ReportsPeriodOption = "thisYear";

export function isReportsPeriodOption(value: string): value is ReportsPeriodOption {
  return (REPORTS_PERIOD_OPTIONS as readonly string[]).includes(value);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Date du jour au format `YYYY-MM-DD`, en UTC. */
export function todayISO(referenceDate: Date = new Date()): string {
  return `${referenceDate.getUTCFullYear()}-${pad(referenceDate.getUTCMonth() + 1)}-${pad(referenceDate.getUTCDate())}`;
}

export interface ResolvedPeriod {
  start: string;
  end: string;
}

/**
 * Résout une option de période en bornes `start`/`end` (YYYY-MM-DD).
 * `thisYear` = 1er janvier → aujourd'hui (year-to-date), pas le 31 décembre :
 * une organisation n'a pas de transactions futures, inutile d'inclure une
 * plage vide.
 */
export function resolveReportsPeriod(
  option: ReportsPeriodOption,
  custom?: { from?: string; to?: string },
  referenceDate: Date = new Date(),
): ResolvedPeriod {
  const end = todayISO(referenceDate);

  if (option === "last30days") {
    const past = new Date(referenceDate);
    past.setUTCDate(past.getUTCDate() - 30);
    return { start: todayISO(past), end };
  }

  if (option === "custom") {
    return {
      start: custom?.from ?? end,
      end: custom?.to ?? end,
    };
  }

  return { start: `${referenceDate.getUTCFullYear()}-01-01`, end };
}
