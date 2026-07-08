"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { declineInvitation } from "@/lib/invitations/actions";
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
 * Refus d'invitation (volet 2 de la 4B, checkpoint 3b) — même convention que
 * `ArchiveMemberDialog`/`InvitationRowActions` (AlertDialog contrôlé
 * localement). Le succès se termine par un `redirect` serveur vers
 * `/invitations/declined` : on ne revient ici qu'en cas d'erreur.
 */
export function DeclineInvitationDialog({
  token,
  organizationName,
}: {
  token: string;
  organizationName: string;
}) {
  const t = useTranslations("invitations.accept");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await declineInvitation(token);
      if (result.error) {
        setError(t("decline.error"));
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        {t("cta.decline")}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("decline.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("decline.description", { orgName: organizationName })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              {t("decline.back")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirm}
              disabled={isPending}
            >
              {isPending ? t("decline.submitting") : t("decline.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
