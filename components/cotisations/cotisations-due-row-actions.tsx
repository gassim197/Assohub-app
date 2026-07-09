"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Menu d'actions d'une ligne de l'onglet "Cotisations dues" (checkpoint 3).
 *
 * « Voir les détails » navigue vers la fiche du membre concerné — il n'existe
 * pas encore de fiche détaillée par cotisation en 5A. « Enregistrer un
 * paiement » est préparé pour la 5B et désactivé ici (spec 5A §5).
 */
export function CotisationsDueRowActions({
  orgSlug,
  memberId,
}: {
  orgSlug: string;
  memberId: string;
}) {
  const t = useTranslations("cotisations.due.rowActions");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={t("label")}>
            <MoreHorizontal />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          render={<Link href={`/${orgSlug}/members/${memberId}`} />}
        >
          {t("viewDetails")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled>{t("recordPayment")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
