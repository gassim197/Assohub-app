"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { changeMemberStatus } from "@/lib/members/actions";
import {
  DEFAULT_MEMBER_STATUS,
  MEMBER_STATUSES,
  STATUS_I18N_KEY,
  isMemberStatus,
  type MemberStatus,
} from "@/lib/members/constants";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Cible minimale d'un changement de statut (réutilisé fiche + lignes). */
export interface StatusChangeTarget {
  id: string;
  fullName: string;
  status: string;
}

/**
 * Mini-dialog de changement de statut (BLOC 3).
 *
 * Contrôlé par le parent (`open`/`onOpenChange`) pour être ouvert depuis un
 * menu d'actions (fiche détaillée ou ligne d'annuaire). Toute la logique métier
 * de `left_at` vit côté serveur dans `changeMemberStatus` (schema-design §4.1).
 */
export function StatusChangeDialog({
  orgSlug,
  member,
  open,
  onOpenChange,
}: {
  orgSlug: string;
  member: StatusChangeTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("members");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const current: MemberStatus = isMemberStatus(member.status)
    ? member.status
    : DEFAULT_MEMBER_STATUS;
  const [status, setStatus] = useState<MemberStatus>(current);

  // Repartir du statut courant à chaque ouverture (ouverture pilotée par le
  // parent : un simple handler onOpenChange ne suffit pas pour un open programmatique).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setStatus(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function onConfirm() {
    startTransition(async () => {
      const result = await changeMemberStatus(orgSlug, member.id, { status });

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("statusDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("statusDialog.description", { name: member.fullName })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label>{t("statusDialog.label")}</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as MemberStatus)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEMBER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`status.${STATUS_I18N_KEY[s]}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("statusDialog.cancel")}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isPending}>
            {isPending
              ? t("statusDialog.submitting")
              : t("statusDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
