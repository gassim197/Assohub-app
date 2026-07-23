import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * Mention légale cliquable des layouts publics `/invitations/*` et
 * `/join/*` (parcours d'acceptation d'invitation) — même modèle que la
 * mention de consentement de `/register` (`auth.legalConsent.*`, réutilisée
 * ici pour éviter de dupliquer "conditions d'utilisation"/"politique de
 * confidentialité" dans un second namespace), seul le préambule diffère
 * ("en rejoignant" plutôt que "en créant un compte").
 */
export async function InvitationLegalLine() {
  const [t, tConsent] = await Promise.all([
    getTranslations("invitations.accept.footer"),
    getTranslations("auth.legalConsent"),
  ]);

  return (
    <p>
      {t("legalPrefix")}{" "}
      <Link href="/conditions-utilisation" className="underline-offset-2 hover:underline">
        {tConsent("terms")}
      </Link>{" "}
      {tConsent("and")}{" "}
      <Link href="/confidentialite" className="underline-offset-2 hover:underline">
        {tConsent("privacy")}
      </Link>
      {tConsent("suffix")}
    </p>
  );
}
