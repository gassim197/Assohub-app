import type { CotisationFrequency, RecurringFrequency } from "./constants";

/**
 * Utilitaires de calcul de période — purs, sans dépendance à `db`.
 *
 * Volontairement isolés de `generation.ts` (qui importe `db` pour
 * `ensureCotisationsGenerated`) : ce module est importé par des Client
 * Components (`record-payment-dialog.tsx`) pour formater une période côté
 * navigateur. Si ces fonctions vivaient dans `generation.ts`, tout le module
 * — y compris la connexion Postgres — serait embarqué dans le bundle client,
 * où `process.env.DATABASE_URL` est `undefined` : `neon(undefined)` lève une
 * exception au chargement du module côté navigateur (crash immédiat).
 */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateString(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Date du jour au format `YYYY-MM-DD`, en UTC (= Africa/Conakry, GMT+0 sans DST). */
export function todayISO(referenceDate: Date = new Date()): string {
  return toDateString(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
  );
}

/**
 * Bornes calendaires d'un mois, indépendamment de toute fréquence de
 * cotisation — utilisé par le filtre "période" de l'onglet Cotisations dues
 * (`monthOffset = 0` mois courant, `-1` mois dernier).
 */
export function getMonthRange(
  referenceDate: Date,
  monthOffset = 0,
): { from: string; to: string } {
  const base = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + monthOffset, 1),
  );
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  return {
    from: toDateString(year, month, 1),
    to: toDateString(year, month, lastDayOfMonth(year, month)),
  };
}

export interface Period {
  periodStart: string;
  periodEnd: string;
  /**
   * Forme canonique neutre stockée en base ("2026-07", "2026-Q3", "2026") —
   * jamais un libellé figé dans une langue (schema-design §5.2, décision 5A).
   */
  canonicalLabel: string;
}

/**
 * Détermine la période courante pour une fréquence récurrente donnée.
 * Calcul en UTC : Africa/Conakry est GMT+0 toute l'année (pas de DST), donc
 * les getters UTC de `Date` donnent directement la date locale de l'organisation.
 */
export function getCurrentPeriod(
  frequency: RecurringFrequency,
  referenceDate: Date = new Date(),
): Period {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth(); // 0-11

  if (frequency === "monthly") {
    return {
      periodStart: toDateString(year, month, 1),
      periodEnd: toDateString(year, month, lastDayOfMonth(year, month)),
      canonicalLabel: `${year}-${pad(month + 1)}`,
    };
  }

  if (frequency === "quarterly") {
    const quarterIndex = Math.floor(month / 3); // 0-3
    const startMonth = quarterIndex * 3;
    const endMonth = startMonth + 2;
    return {
      periodStart: toDateString(year, startMonth, 1),
      periodEnd: toDateString(year, endMonth, lastDayOfMonth(year, endMonth)),
      canonicalLabel: `${year}-Q${quarterIndex + 1}`,
    };
  }

  // annually
  return {
    periodStart: toDateString(year, 0, 1),
    periodEnd: toDateString(year, 11, 31),
    canonicalLabel: `${year}`,
  };
}

/**
 * Libellé de période affichable, calculé à la lecture à partir de `period_start`
 * (jamais depuis le `period_label` canonique stocké) : le cookie `NEXT_LOCALE`
 * est par navigateur, pas par organisation, donc l'affichage doit rester
 * calculable dans n'importe quelle locale à tout moment.
 */
export function formatPeriodLabel(
  periodStart: string,
  frequency: CotisationFrequency,
  locale: string,
): string {
  const [yearStr, monthStr, dayStr] = periodStart.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const date = new Date(Date.UTC(year, monthIndex, Number(dayStr)));

  if (frequency === "annually") {
    return String(year);
  }

  if (frequency === "quarterly") {
    const quarter = Math.floor(monthIndex / 3) + 1;
    const prefix = locale.startsWith("fr") ? "T" : "Q";
    return `${prefix}${quarter} ${year}`;
  }

  if (frequency === "monthly") {
    const formatted = new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  // one_time (5B) : pas de génération auto, mais l'affichage doit rester défini.
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}
