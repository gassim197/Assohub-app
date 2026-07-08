import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";

/**
 * Page de remerciement neutre après refus d'invitation (volet 2 de la 4B,
 * checkpoint 3b). Statique, aucune donnée sensible : le token n'est pas
 * repris ici, `declineInvitation` a déjà fait tout le travail avant le
 * `redirect`.
 */
export default async function InvitationDeclinedPage() {
  const t = await getTranslations("invitations.declinedPage");

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
        <h1 className="text-lg font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </CardContent>
    </Card>
  );
}
