"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { changeMinutesStatus } from "@/lib/meetings/minutes-actions";
import {
  DEFAULT_MINUTES_STATUS,
  MINUTES_STATUSES,
  isMinutesStatus,
  type MinutesStatus,
} from "@/lib/meetings/minutes-constants";
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

/**
 * Dialog de changement de statut d'un PV (checkpoint 2, même patron que
 * `MeetingStatusDialog`) : sélecteur libre, aucune transition n'est
 * privilégiée — la garde « un seul PV non-archivé par réunion » vit côté
 * serveur (`changeMinutesStatus`), pas dans cette UI.
 */
export function MeetingMinutesStatusDialog({
  orgSlug,
  minutesId,
  status: currentStatus,
  open,
  onOpenChange,
}: {
  orgSlug: string;
  minutesId: string;
  status: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("meetings.minutes");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const current: MinutesStatus = isMinutesStatus(currentStatus)
    ? currentStatus
    : DEFAULT_MINUTES_STATUS;
  const [status, setStatus] = useState<MinutesStatus>(current);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setStatus(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function onConfirm() {
    startTransition(async () => {
      const result = await changeMinutesStatus(orgSlug, minutesId, { status });

      if (result.ok) {
        toast.success(t("statusDialog.success"));
        onOpenChange(false);
        router.refresh();
        return;
      }

      toast.error(
        result.error === "conflict"
          ? t("form.errorConflict")
          : t("statusDialog.error"),
      );
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("statusDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("statusDialog.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-2">
          <Label>{t("statusDialog.label")}</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as MinutesStatus)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MINUTES_STATUSES.map((s) => (
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
          <Button type="button" onClick={onConfirm} disabled={isPending}>
            {isPending ? t("statusDialog.submitting") : t("statusDialog.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
