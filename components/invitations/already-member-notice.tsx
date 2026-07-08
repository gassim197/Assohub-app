import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * État "déjà membre" de `/join/[token]` (volet 4 de la 4B, checkpoint 2,
 * brief point A) : un visiteur connecté déjà membre actif de l'organisation
 * n'a rien à faire ici, juste un accès direct au tableau de bord — jamais un
 * message d'erreur.
 */
export async function AlreadyMemberNotice({
  orgSlug,
  organizationName,
}: {
  orgSlug: string;
  organizationName: string;
}) {
  const t = await getTranslations("invitations.join.alreadyMember");

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="size-6" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold text-foreground">
            {t("title", { orgName: organizationName })}
          </h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button render={<Link href={`/${orgSlug}`} />}>{t("cta")}</Button>
      </CardContent>
    </Card>
  );
}
