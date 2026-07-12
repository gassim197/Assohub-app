"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MeetingStatusDialog,
  type MeetingStatusTarget,
} from "./meeting-status-dialog";
import { DeleteMeetingDialog } from "./delete-meeting-dialog";

/**
 * Menu d'actions d'une ligne de réunion (checkpoint 3, session 6A).
 *
 * « Voir les détails » navigue vers la page détaillée. « Modifier » ouvre la
 * modale d'édition en place sur la liste (`?editMeeting=true&meetingId=X`,
 * filtres préservés) : pas de navigation, on reste dans la liste. Statut et
 * suppression ouvrent leur dialog contrôlé ; après suppression on rafraîchit
 * la liste (pas de redirection, même patron que `MemberRowActions`).
 */
export function MeetingRowActions({
  orgSlug,
  meeting,
}: {
  orgSlug: string;
  meeting: MeetingStatusTarget;
}) {
  const t = useTranslations("meetings.rowActions");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function openEdit() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("editMeeting", "true");
    params.set("meetingId", meeting.id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={t("label")}>
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            render={<Link href={`/${orgSlug}/meetings/${meeting.id}`} />}
          >
            {t("view")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openEdit}>{t("edit")}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setStatusOpen(true)}>
            {t("changeStatus")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            {t("delete")}
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
      />
    </>
  );
}
