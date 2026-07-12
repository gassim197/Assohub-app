"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { changeMeetingStatus } from "@/lib/meetings/actions";
import {
  DEFAULT_MEETING_STATUS,
  MEETING_STATUSES,
  isMeetingStatus,
  type MeetingStatus,
} from "@/lib/meetings/constants";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Cible minimale d'un changement de statut (réutilisé fiche + lignes). */
export interface MeetingStatusTarget {
  id: string;
  title: string;
  status: string;
}

/**
 * Mini-dialog de changement de statut d'une réunion (checkpoint 3, même
 * patron que `StatusChangeDialog` des membres). Contrôlé par le parent
 * (`open`/`onOpenChange`) pour être ouvert depuis un menu d'actions (fiche
 * détaillée ou ligne de liste).
 *
 * Passage à « annulée » = changement sensible (la réunion disparaît des deux
 * vues par défaut, cf. `lib/meetings/queries.ts`) : confirmation renforcée.
 */
export function MeetingStatusDialog({
  orgSlug,
  meeting,
  open,
  onOpenChange,
}: {
  orgSlug: string;
  meeting: MeetingStatusTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("meetings");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const current: MeetingStatus = isMeetingStatus(meeting.status)
    ? meeting.status
    : DEFAULT_MEETING_STATUS;
  const [status, setStatus] = useState<MeetingStatus>(current);

  const isCritical = status === "annulee";

  // Repartir du statut courant à chaque ouverture (ouverture pilotée par le
  // parent : un simple handler onOpenChange ne suffit pas pour un open programmatique).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setStatus(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function onConfirm() {
    startTransition(async () => {
      const result = await changeMeetingStatus(orgSlug, meeting.id, { status });

      if (result.ok) {
        toast.success(t("statusDialog.success"));
        onOpenChange(false);
        router.refresh();
        return;
      }

      toast.error(t("statusDialog.error"));
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isCritical ? t("statusDialog.criticalTitle") : t("statusDialog.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isCritical
              ? t("statusDialog.criticalDescription", { title: meeting.title })
              : t("statusDialog.description", { title: meeting.title })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-2">
          <Label>{t("statusDialog.label")}</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as MeetingStatus)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEETING_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("statusDialog.cancel")}
          </Button>
          <Button
            type="button"
            variant={isCritical ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending
              ? t("statusDialog.submitting")
              : isCritical
                ? t("statusDialog.criticalConfirm")
                : t("statusDialog.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
