"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import { approveJoinRequest, rejectJoinRequest } from "@/lib/members/actions";
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

export interface JoinRequestRowTarget {
  id: string;
  fullName: string;
}

/**
 * Actions de ligne de l'onglet "Demandes d'adhésion" (volet 4 de la 4B,
 * checkpoint 3). "Approuver" agit directement (non destructif, symétrique à
 * "Renvoyer" pour les invitations). "Refuser" passe par une confirmation
 * (`AlertDialog`) : soft delete, jamais de retour en arrière possible depuis
 * l'UI.
 */
export function JoinRequestRowActions({
  orgSlug,
  request,
}: {
  orgSlug: string;
  request: JoinRequestRowTarget;
}) {
  const t = useTranslations("members.joinRequests");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);

  function onApprove() {
    startTransition(async () => {
      const result = await approveJoinRequest(orgSlug, request.id);
      if (result.ok) {
        toast.success(t("approveSuccess"));
        router.refresh();
      } else {
        toast.error(t("approveError"));
      }
    });
  }

  function onReject() {
    startTransition(async () => {
      const result = await rejectJoinRequest(orgSlug, request.id);
      if (result.ok) {
        toast.success(t("rejectConfirm.success"));
        setRejectOpen(false);
        router.refresh();
      } else {
        toast.error(t("rejectConfirm.error"));
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
              aria-label={t("actions.label")}
            >
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onApprove} disabled={isPending}>
            {t("actions.approve")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setRejectOpen(true)}
          >
            {t("actions.reject")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("rejectConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("rejectConfirm.description", { fullName: request.fullName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={isPending}
            >
              {t("rejectConfirm.back")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onReject}
              disabled={isPending}
            >
              {isPending ? t("rejectConfirm.submitting") : t("rejectConfirm.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
