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
  StatusChangeDialog,
  type StatusChangeTarget,
} from "./status-change-dialog";
import { ArchiveMemberDialog } from "./archive-member-dialog";

/**
 * Menu d'actions d'une ligne d'annuaire (BLOC 3).
 *
 * « Voir la fiche » navigue vers la page détaillée. « Modifier » ouvre la modal
 * d'édition en place sur la liste (`?edit=true&memberId=X`, filtres préservés) :
 * pas de navigation, on reste dans l'annuaire. Statut et archivage ouvrent leur
 * dialog contrôlé ; après archivage on rafraîchit la liste (pas de redirection).
 */
export function MemberRowActions({
  orgSlug,
  member,
}: {
  orgSlug: string;
  member: StatusChangeTarget;
}) {
  const t = useTranslations("members");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [statusOpen, setStatusOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  function openEdit() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("edit", "true");
    params.set("memberId", member.id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("rowActions.label")}
            >
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            render={<Link href={`/${orgSlug}/members/${member.id}`} />}
          >
            {t("rowActions.view")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openEdit}>
            {t("rowActions.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setStatusOpen(true)}>
            {t("rowActions.changeStatus")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setArchiveOpen(true)}
          >
            {t("rowActions.archive")}
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
      />
    </>
  );
}
