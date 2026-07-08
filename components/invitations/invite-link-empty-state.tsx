import Link from "next/link";
import { Link2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** État vide de l'onglet "Lien d'invitation" (volet 3 de la 4B, checkpoint 1). */
export async function InviteLinkEmptyState({ orgSlug }: { orgSlug: string }) {
  const t = await getTranslations("invitations.inviteLink");

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 rounded-full bg-primary/10 p-4">
          <Link2 className="size-10 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">{t("empty.title")}</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {t("empty.description")}
        </p>
        <Button
          className="mt-6"
          render={<Link href={`/${orgSlug}/members?generateLink=true`} />}
        >
          <Link2 />
          {t("empty.cta")}
        </Button>
      </CardContent>
    </Card>
  );
}
