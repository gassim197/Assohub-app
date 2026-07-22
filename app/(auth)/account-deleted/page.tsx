"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Page d'adieu après suppression de compte (chantier "zone de danger") —
 * atteinte après `deleteMyAccount` + `signOut()` côté client
 * (`components/settings/delete-account-dialog.tsx`). Pas de landing
 * marketing en V1 (CLAUDE.md) : le lien pointe vers `/login`, qui porte
 * déjà "Créer un compte" et sert donc aussi de point de réinscription.
 */
export default function AccountDeletedPage() {
  const t = useTranslations("auth.accountDeleted");

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-brand-subtle text-primary">
          <CheckCircle2 className="size-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button render={<Link href="/login" />}>{t("backToLogin")}</Button>
      </CardContent>
    </Card>
  );
}
