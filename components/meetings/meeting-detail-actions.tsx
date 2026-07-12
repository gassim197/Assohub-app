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
  MeetingStatusDialog,
  type MeetingStatusTarget,
} from "./meeting-status-dialog";
import { DeleteMeetingDialog } from "./delete-meeting-dialog";

/**
 * Menu d'actions secondaires de la fiche détaillée (checkpoint 3, même
 * patron que `MemberDetailActions`).
 *
 * Le bouton « Modifier » vit dans l'en-tête de la page (lien
 * `?editMeeting=true&meetingId=X`). Ce menu porte les actions à effet de
 * bord : changement de statut et suppression, chacune ouvrant son dialog
 * contrôlé. Après suppression on redirige vers la liste (la fiche n'est plus
 * consultable).
 */
export function MeetingDetailActions({
  orgSlug,
  meeting,
}: {
  orgSlug: string;
  meeting: MeetingStatusTarget;
}) {
  const t = useTranslations("meetings");
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
            onClick={() => setDeleteOpen(true)}
          >
            {t("detail.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MeetingStatusDialog
        orgSlug={orgSlug}
        meeting={meeting}
        open={statusOpen}
        onOpenChange={setStatusOpen}
      />
      <DeleteMeetingDialog
        orgSlug={orgSlug}
        meeting={meeting}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        redirectTo={`/${orgSlug}/meetings`}
      />
    </>
  );
}
