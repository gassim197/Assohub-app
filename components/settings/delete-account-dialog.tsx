"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { deleteMyAccount } from "@/lib/settings/actions";
import { ACCOUNT_DELETION_CONFIRMATION_WORD } from "@/lib/settings/schema";
import { signOut } from "@/lib/auth/client";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteAccountDialogProps {
  orgSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmation forte de suppression de compte — exige de taper le mot-clé
 * exact (`ACCOUNT_DELETION_CONFIRMATION_WORD`) pour activer le bouton.
 * Au succès : `signOut()` (client) nettoie le cookie du navigateur — les
 * sessions sont déjà détruites côté serveur par `deleteMyAccount`
 * (`auth.api.revokeSessions`), ceci garantit juste un état client cohérent
 * avant la redirection.
 */
export function DeleteAccountDialog({
  orgSlug,
  open,
  onOpenChange,
}: DeleteAccountDialogProps) {
  const t = useTranslations("settings.dangerZone.confirmDialog");
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();

  const canConfirm = confirmation === ACCOUNT_DELETION_CONFIRMATION_WORD;

  function handleOpenChange(next: boolean) {
    if (!next) setConfirmation("");
    onOpenChange(next);
  }

  function onConfirm() {
    if (!canConfirm) return;
    startTransition(async () => {
      const result = await deleteMyAccount(orgSlug, { confirmation });

      if (!result.ok) {
        toast.error(t("error"));
        return;
      }

      try {
        await signOut();
      } catch {
        // Le compte est déjà supprimé côté serveur — un échec ici n'empêche
        // pas la redirection.
      }
      router.push("/account-deleted");
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="delete-account-confirmation">
            {t("confirmLabel", { word: ACCOUNT_DELETION_CONFIRMATION_WORD })}
          </Label>
          <Input
            id="delete-account-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            autoFocus
          />
        </div>

        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={!canConfirm || isPending}
          >
            {isPending ? t("submitting") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
