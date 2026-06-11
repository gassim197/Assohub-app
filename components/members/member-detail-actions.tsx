"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  StatusChangeDialog,
  type StatusChangeTarget,
} from "./status-change-dialog";
import { ArchiveMemberDialog } from "./archive-member-dialog";

/**
 * Menu d'actions secondaires de la fiche détaillée (BLOC 3).
 *
 * Le bouton « Modifier » (édition) vit dans l'en-tête de la page (lien `?edit=true`).
 * Ce menu porte les actions à effet de bord : changement de statut et archivage,
 * chacune ouvrant son dialog contrôlé. Après archivage on redirige vers l'annuaire.
 */
export function MemberDetailActions({
  orgSlug,
  member,
}: {
  orgSlug: string;
  member: StatusChangeTarget;
}) {
  const t = useTranslations("members");
  const [statusOpen, setStatusOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              aria-label={t("detail.moreActions")}
            >
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setStatusOpen(true)}>
            {t("detail.changeStatus")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setArchiveOpen(true)}
          >
            {t("detail.archive")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <StatusChangeDialog
        orgSlug={orgSlug}
        member={member}
        open={statusOpen}
        onOpenChange={setStatusOpen}
      />
      <ArchiveMemberDialog
        orgSlug={orgSlug}
        member={member}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        redirectTo={`/${orgSlug}/members`}
      />
    </>
  );
}
