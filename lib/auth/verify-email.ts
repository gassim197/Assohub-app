/**
 * Destinations possibles après vérification d'email (chantier 3). Volontairement
 * une liste blanche fermée (pas d'URL arbitraire acceptée depuis la query
 * string) : "home" couvre `/` (redirection intelligente existante — onboarding
 * ou organisation active) et "joinPending" couvre l'inscription en attente de
 * validation admin via lien partageable (`/join/[token]` en mode manuel), où
 * la ligne `member` n'existe pas encore et où `/` enverrait à tort vers
 * l'onboarding "créer une organisation".
 */
export const VERIFY_EMAIL_NEXT_VALUES = ["home", "joinPending"] as const;
export type VerifyEmailNext = (typeof VERIFY_EMAIL_NEXT_VALUES)[number];

export function isVerifyEmailNext(value: string | null): value is VerifyEmailNext {
  return (VERIFY_EMAIL_NEXT_VALUES as readonly string[]).includes(value ?? "");
}

export function resolveVerifyEmailNextPath(next: string | null): string {
  return next === "joinPending" ? "/join/pending" : "/";
}

/**
 * Construit le `callbackURL` transmis à Better-Auth (`signUpEmail`,
 * `sendVerificationEmail`) pour le lien de vérification : pointe vers notre
 * page de confirmation, qui saura afficher succès/erreur et rediriger vers la
 * bonne destination. Better-Auth ajoute lui-même `&error=...` à cette URL en
 * cas de token invalide/expiré (`GET /api/auth/verify-email`).
 */
export function buildVerifyEmailCallbackURL(
  email: string,
  next: VerifyEmailNext = "home",
): string {
  const params = new URLSearchParams({ email, next });
  return `/verify-email/confirm?${params.toString()}`;
}

/** Masque une adresse email pour affichage ("ga***@gmail.com"). */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}
