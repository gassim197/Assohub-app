"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { deleteOrganization } from "@/lib/organizations/actions";
import type { OrganizationDeletionStats } from "@/lib/organizations/queries";
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

interface DeleteOrganizationDialogProps {
  orgSlug: string;
  organizationName: string;
  stats: OrganizationDeletionStats;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmation forte de suppression d'organisation — exige de taper le nom
 * exact de l'organisation (pattern GitHub) pour activer le bouton. Contrairement
 * à `DeleteAccountDialog` (mot-clé fixe), la valeur attendue varie par
 * organisation ; elle est re-vérifiée côté serveur contre le nom réel
 * (`deleteOrganization`), jamais de confiance dans cette prop seule.
 */
export function DeleteOrganizationDialog({
  orgSlug,
  organizationName,
  stats,
  open,
  onOpenChange,
}: DeleteOrganizationDialogProps) {
  const t = useTranslations("settings.organizationDangerZone.confirmDialog");
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();

  const canConfirm = confirmation === organizationName;

  function handleOpenChange(next: boolean) {
    if (!next) setConfirmation("");
    onOpenChange(next);
  }

  function onConfirm() {
    if (!canConfirm) return;
    startTransition(async () => {
      const result = await deleteOrganization(orgSlug, { confirmation });

      if (!result.ok) {
        toast.error(t("error"));
        return;
      }

      toast.success(t("success", { name: organizationName }));
      router.push(result.redirectTo);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: organizationName })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("stats", {
              members: stats.memberCount,
              cotisations: stats.cotisationCount,
              payments: stats.paymentCount,
              meetings: stats.meetingCount,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {stats.otherUserCount > 0 ? (
          <p className="text-sm font-medium text-destructive">
            {t("otherMembersWarning", { count: stats.otherUserCount })}
          </p>
        ) : null}

        <p className="text-sm text-muted-foreground">
          {t("exportReminder")}{" "}
          <Link
            href={`/${orgSlug}/reports`}
            className="text-foreground underline-offset-2 hover:underline"
          >
            {t("exportReminderLink")}
          </Link>{" "}
          {t("exportReminderSuffix")}
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="delete-org-confirmation">
            {t("confirmLabel", { name: organizationName })}
          </Label>
          <Input
            id="delete-org-confirmation"
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
