import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";

/**
 * Confirmation publique après une inscription en mode manuel via lien
 * partageable (volet 4 de la 4B, checkpoint 2) — pendant de
 * `/invitations/declined` : statique, générique, ne reprend pas le token
 * (`registerAndJoinViaLink`/`joinViaInviteLink` ont déjà fait tout le travail
 * avant le `redirect`).
 */
export default async function JoinPendingPage() {
  const t = await getTranslations("invitations.join.pendingPage");

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
        <h1 className="text-lg font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </CardContent>
    </Card>
  );
}
