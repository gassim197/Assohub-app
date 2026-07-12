"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { softDeleteMeeting } from "@/lib/meetings/actions";
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

/** Cible minimale d'une suppression (réutilisé fiche + lignes). */
export interface DeleteMeetingTarget {
  id: string;
  title: string;
}

/**
 * Confirmation de suppression (soft delete, checkpoint 3, même patron que
 * `ArchiveMemberDialog`). Contrôlé par le parent. Aucun hard delete : l'action
 * serveur pose `deleted_at`, la ligne reste en base. `redirectTo` permet à la
 * fiche détaillée de rediriger vers la liste après suppression (la fiche
 * n'est plus consultable) ; sans lui, on rafraîchit simplement la vue
 * courante (lignes).
 */
export function DeleteMeetingDialog({
  orgSlug,
  meeting,
  open,
  onOpenChange,
  redirectTo,
}: {
  orgSlug: string;
  meeting: DeleteMeetingTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo?: string;
}) {
  const t = useTranslations("meetings");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const result = await softDeleteMeeting(orgSlug, meeting.id);

      if (result.ok) {
        toast.success(t("deleteDialog.success"));
        onOpenChange(false);
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
        }
        return;
      }

      toast.error(t("deleteDialog.error"));
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteDialog.description", { title: meeting.title })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("deleteDialog.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? t("deleteDialog.submitting") : t("deleteDialog.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
