"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { deleteDocument } from "@/lib/documents/actions";
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

/**
 * Confirmation de suppression d'un document. `deleteDocument` supprime le
 * blob AVANT la ligne DB (cf. commentaire de l'action) : un échec de
 * suppression Blob laisse le document intact et affiche un message dédié
 * distinct de l'erreur générique, plutôt qu'un état incohérent où le document
 * disparaîtrait de la liste sans que son fichier ait vraiment été libéré.
 */
export function DeleteDocumentDialog({
  orgSlug,
  document,
  open,
  onOpenChange,
}: {
  orgSlug: string;
  document: { id: string; displayName: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("documents.deleteDialog");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const result = await deleteDocument(orgSlug, document.id);

      if (result.ok) {
        toast.success(t("success"));
        onOpenChange(false);
        router.refresh();
        return;
      }

      toast.error(
        result.error === "blobDeleteFailed" ? t("errorBlobDeleteFailed") : t("error"),
      );
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("description", { name: document.displayName })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? t("submitting") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
