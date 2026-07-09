"use client";

import { useState } from "react";
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
  ArchiveCotisationTypeDialog,
  type ArchiveCotisationTypeTarget,
} from "./archive-cotisation-type-dialog";

/**
 * Menu d'actions d'une ligne de la liste des types de cotisations (checkpoint 1).
 * « Modifier » ouvre la modal d'édition en place (`?editType=true&typeId=X`).
 */
export function CotisationTypeRowActions({
  orgSlug,
  type,
}: {
  orgSlug: string;
  type: ArchiveCotisationTypeTarget;
}) {
  const t = useTranslations("cotisations");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [archiveOpen, setArchiveOpen] = useState(false);

  function openEdit() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("editType", "true");
    params.set("typeId", type.id);
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
              aria-label={t("types.rowActions.label")}
            >
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={openEdit}>
            {t("types.rowActions.edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setArchiveOpen(true)}
          >
            {t("types.rowActions.archive")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ArchiveCotisationTypeDialog
        orgSlug={orgSlug}
        type={type}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
      />
    </>
  );
}
