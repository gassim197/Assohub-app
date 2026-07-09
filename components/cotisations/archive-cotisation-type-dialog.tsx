"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { archiveCotisationType } from "@/lib/cotisations/types-actions";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ArchiveCotisationTypeTarget {
  id: string;
  name: string;
}

/**
 * Confirmation d'archivage d'un type de cotisation (soft delete, checkpoint 1).
 * Les cotisations passées référençant ce type restent intactes (jamais de hard delete).
 */
export function ArchiveCotisationTypeDialog({
  orgSlug,
  type,
  open,
  onOpenChange,
}: {
  orgSlug: string;
  type: ArchiveCotisationTypeTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("cotisations");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const result = await archiveCotisationType(orgSlug, type.id);

      if (result.ok) {
        toast.success(t("types.archiveDialog.success"));
        onOpenChange(false);
        router.refresh();
        return;
      }

      toast.error(t("types.archiveDialog.error"));
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("types.archiveDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("types.archiveDialog.description", { name: type.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("types.archiveDialog.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending
              ? t("types.archiveDialog.submitting")
              : t("types.archiveDialog.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
