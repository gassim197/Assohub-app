"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { softDeleteMember } from "@/lib/members/actions";
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

/** Cible minimale d'un archivage (réutilisé fiche + lignes). */
export interface ArchiveTarget {
  id: string;
  fullName: string;
}

/**
 * Confirmation d'archivage (soft delete, BLOC 3).
 *
 * Contrôlé par le parent. Aucun hard delete : l'action serveur pose `deleted_at`
 * et l'historique (cotisations, présences) reste intact. `redirectTo` permet à la
 * fiche détaillée de rediriger vers l'annuaire après archivage (la fiche n'est
 * plus consultable) ; sans lui, on rafraîchit simplement la vue courante (lignes).
 */
export function ArchiveMemberDialog({
  orgSlug,
  member,
  open,
  onOpenChange,
  redirectTo,
}: {
  orgSlug: string;
  member: ArchiveTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo?: string;
}) {
  const t = useTranslations("members");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const result = await softDeleteMember(orgSlug, member.id);

      if (result.ok) {
        toast.success(t("archiveDialog.success"));
        onOpenChange(false);
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
        }
        return;
      }

      toast.error(t("archiveDialog.error"));
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("archiveDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("archiveDialog.description", { name: member.fullName })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("archiveDialog.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending
              ? t("archiveDialog.submitting")
              : t("archiveDialog.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
