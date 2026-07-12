"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
 * Menu d'actions d'une ligne de réunion (checkpoint 1, session 6A).
 *
 * Seule « Modifier » est disponible ici — « Voir les détails », « Changer le
 * statut » et « Supprimer » arrivent au checkpoint 3, une fois la page
 * détail et les actions correspondantes en place.
 */
export function MeetingRowActions({
  meetingId,
}: {
  meetingId: string;
}) {
  const t = useTranslations("meetings.rowActions");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function openEdit() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("editMeeting", "true");
    params.set("meetingId", meetingId);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={t("label")}>
            <MoreHorizontal />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={openEdit}>{t("edit")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
