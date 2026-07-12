/**
 * Utilitaires de date/heure des réunions — purs, sans dépendance à `db`.
 *
 * Volontairement isolés (même précaution qu'en 5B, `lib/cotisations/period.ts`) :
 * un Client Component (la modale de création/édition) importe ces fonctions
 * pour formater/parser côté navigateur. Si elles vivaient dans un module qui
 * importe `db`, toute la connexion Postgres serait embarquée dans le bundle
 * client, où `process.env.DATABASE_URL` est `undefined` — crash au chargement.
 *
 * Stratégie fuseau horaire : Africa/Conakry est GMT+0 toute l'année (pas de
 * DST) — numériquement identique à UTC. La valeur d'un `<input
 * type="datetime-local">` ("2026-07-22T10:30", sans fuseau) est donc traitée
 * directement comme de l'UTC pur, sans aucune conversion arithmétique.
 * L'affichage force systématiquement `timeZone: "UTC"` dans `Intl` — jamais
 * le fuseau du serveur Node, qui pourrait diverger de celui de l'organisation.
 */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

const DATETIME_LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Valide le format brut d'un `<input type="datetime-local">` (garde-fou Zod). */
export function isValidDatetimeLocal(value: string): boolean {
  return DATETIME_LOCAL_RE.test(value);
}

/**
 * Convertit la valeur d'un `datetime-local` ("2026-07-22T10:30") en `Date`
 * UTC, pour le stockage. Ne doit être appelé qu'après validation du format.
 */
export function parseDatetimeLocalAsUtc(value: string): Date {
  return new Date(`${value}:00.000Z`);
}

/**
 * Convertit une `Date` stockée (UTC) en valeur de `datetime-local`
 * ("2026-07-22T10:30"), pour pré-remplir le formulaire d'édition.
 */
export function formatDatetimeLocalFromUtc(date: Date): string {
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/** Clé de jour ("2026-07-22") en UTC — utilisée côté serveur (le jour "Conakry" d'une réunion stockée). */
export function toDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/**
 * Clé de jour ("2026-07-22") en heure **locale du navigateur** — utilisée
 * uniquement par le widget calendrier (checkpoint 2), qui affiche des jours
 * calendaires locaux (react-day-picker n'a pas de notion de fuseau global).
 * Simplification assumée : pour une association basée à Conakry consultant
 * l'app depuis Conakry (l'écrasante majorité des cas réels), fuseau local du
 * navigateur = Africa/Conakry = UTC, donc `toDateKey` et `toLocalDateKey`
 * coïncident. Un lecteur consultant depuis un tout autre fuseau pourrait voir
 * un décalage d'un jour sur le calendrier — non traité en V1.
 */
export function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Construit un objet `Date` en heure locale à partir d'une clé "YYYY-MM-DD"
 * (calendrier), pour le marquage des jours dans le widget — `new
 * Date("2026-07-22")` serait interprété en UTC et pourrait glisser d'un jour
 * une fois affiché en local.
 */
export function parseLocalDateKey(key: string): Date {
  const parts = key.split("-").map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(year, month - 1, day);
}

/**
 * Formate la date/heure d'une réunion pour l'affichage
 * ("Mardi 22 juillet 2026, 10h30" en FR, "Tuesday, July 22, 2026, 10:30 AM" en EN).
 */
export function formatMeetingDateTime(date: Date, locale: string): string {
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const datePart = dateFormatter.format(date);
  const capitalized = datePart.charAt(0).toUpperCase() + datePart.slice(1);

  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const timePart = locale.startsWith("fr")
    ? `${hours}h${pad(minutes)}`
    : new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
      }).format(date);

  return `${capitalized}, ${timePart}`;
}
