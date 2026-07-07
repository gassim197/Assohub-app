"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import { cancelInvitation, resendInvitation } from "@/lib/invitations/actions";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface InvitationRowTarget {
  id: string;
  email: string;
}

/**
 * Actions de ligne de l'onglet "Invitations en attente" (volet 1 de la 4B).
 *
 * "Renvoyer" agit directement (non destructif). "Annuler" passe par une
 * confirmation (`AlertDialog`), même convention que `ArchiveMemberDialog`
 * pour les actions qui retirent définitivement une ligne de la vue courante.
 */
export function InvitationRowActions({
  orgSlug,
  invitation,
}: {
  orgSlug: string;
  invitation: InvitationRowTarget;
}) {
  const t = useTranslations("invitations");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);

  function onResend() {
    startTransition(async () => {
      const result = await resendInvitation(orgSlug, invitation.id);
      if (result.ok) {
        toast.success(t("tab.resendSuccess"));
        router.refresh();
      } else {
        toast.error(t("tab.resendError"));
      }
    });
  }

  function onCancel() {
    startTransition(async () => {
      const result = await cancelInvitation(orgSlug, invitation.id);
      if (result.ok) {
        toast.success(t("tab.cancelConfirm.success"));
        setCancelOpen(false);
        router.refresh();
      } else {
        toast.error(t("tab.cancelConfirm.error"));
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("tab.actions.label")}
            >
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onResend} disabled={isPending}>
            {t("tab.actions.resend")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setCancelOpen(true)}
          >
            {t("tab.actions.cancel")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("tab.cancelConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("tab.cancelConfirm.description", { email: invitation.email })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={isPending}
            >
              {t("tab.cancelConfirm.back")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onCancel}
              disabled={isPending}
            >
              {isPending
                ? t("tab.cancelConfirm.submitting")
                : t("tab.cancelConfirm.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
