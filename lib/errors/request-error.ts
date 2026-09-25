/**
 * Classification des échecs de requête, partagée par tous les formulaires.
 *
 * Contexte : sur des connexions instables, un échec réseau ou une panne de la
 * base de données ne doit jamais être présenté comme une erreur métier
 * (« Email ou mot de passe incorrect », « Email déjà utilisé »…) — l'utilisateur
 * croirait s'être trompé alors qu'il lui suffit de réessayer.
 *
 * Quatre cas :
 *  - `auth`       : erreur métier reconnue (identifiants, validation…) → le
 *                   message propre au formulaire ;
 *  - `network`    : la requête n'a jamais abouti (`TypeError: Failed to fetch`,
 *                   navigateur hors ligne) ;
 *  - `rate_limit` : statut 429 (limiteur de Better-Auth) ;
 *  - `server`     : statut 5xx, ou code d'erreur non reconnu.
 *
 * Messages : `common.errors.<kind>` (messages/fr.json, messages/en.json), via
 * {@link requestErrorMessageKey}.
 */
import { unstable_rethrow } from "next/navigation";

export type RequestFailureKind = "network" | "server" | "rate_limit";
export type AuthErrorKind = "auth" | RequestFailureKind;

/** Clé next-intl (espace `common`) du message d'un échec technique. */
export function requestErrorMessageKey(kind: RequestFailureKind): `errors.${RequestFailureKind}` {
  return `errors.${kind}`;
}

/**
 * Erreur LEVÉE par un appel (jamais une réponse HTTP) : `fetch` rejette avec
 * un `TypeError` quand la requête n'aboutit pas (réseau coupé, DNS, CORS,
 * connexion interrompue). Tout le reste — y compris l'erreur générique
 * qu'une Server Action renvoie quand elle lève côté serveur — est une erreur
 * serveur.
 */
export function classifyThrownError(error: unknown): Exclude<RequestFailureKind, "rate_limit"> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "network";
  if (error instanceof TypeError) return "network";
  return "server";
}

/** Forme minimale d'une erreur renvoyée (non levée) par le client Better-Auth. */
export interface AuthResponseError {
  status?: number;
  code?: string;
}

/**
 * Erreur RENVOYÉE par le client Better-Auth (`{ data: null, error }`). Seuls
 * les codes listés dans `knownCodes` — ceux que le formulaire sait
 * expliquer — sont des erreurs métier ; un code inconnu ou absent est
 * traité comme une panne, jamais comme une erreur d'identifiants.
 */
export function classifyAuthResponseError(
  error: AuthResponseError,
  knownCodes: readonly string[],
): AuthErrorKind {
  if (error.status === 429) return "rate_limit";
  if (error.status !== undefined && error.status >= 500) return "server";
  if (error.code && knownCodes.includes(error.code)) return "auth";
  return "server";
}

export type AuthCallResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: AuthErrorKind; code?: string };

/**
 * Appelle une méthode du client Better-Auth sans jamais lever : les rejets
 * réseau (non capturés par Better-Auth, `catchAllError` désactivé) deviennent
 * `{ ok: false, kind: "network" }` au lieu d'une promesse rejetée non gérée.
 */
export async function callAuth<T>(
  call: () => Promise<{ data: T | null; error: (AuthResponseError & { message?: string }) | null }>,
  knownCodes: readonly string[],
): Promise<AuthCallResult<T>> {
  try {
    const result = await call();
    if (result.error) {
      return {
        ok: false,
        kind: classifyAuthResponseError(result.error, knownCodes),
        code: result.error.code,
      };
    }
    return { ok: true, data: result.data as T };
  } catch (error) {
    return { ok: false, kind: classifyThrownError(error) };
  }
}

/**
 * Appelle une Server Action sans jamais lever. Sans ce garde-fou, une action
 * qui échoue dans un `startTransition` (réseau coupé, base injoignable)
 * remonte jusqu'à l'error boundary et remplace toute la page — la saisie
 * de l'utilisateur est perdue.
 */
export async function runAction<T>(
  action: () => Promise<T>,
): Promise<T | { ok: false; error: Exclude<RequestFailureKind, "rate_limit"> }> {
  try {
    return await action();
  } catch (error) {
    // Une action qui réussit par `redirect()` (inscription d'un invité…)
    // rejette côté client avec l'erreur interne de redirection de Next : elle
    // doit remonter telle quelle pour que la navigation ait lieu.
    unstable_rethrow(error);
    return { ok: false, error: classifyThrownError(error) };
  }
}

/** Vrai si `error` est l'un des échecs techniques renvoyés par {@link runAction}. */
export function isRequestFailure(error: unknown): error is Exclude<RequestFailureKind, "rate_limit"> {
  return error === "network" || error === "server";
}
