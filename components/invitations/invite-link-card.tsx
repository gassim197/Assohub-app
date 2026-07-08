"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Copy } from "lucide-react";

import { revokeOrganizationInviteLink } from "@/lib/invitations/actions";
import { isInviteLinkAcceptanceMode } from "@/lib/invitations/constants";
import { toast } from "@/components/ui/toaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ActiveInviteLink {
  id: string;
  url: string;
  acceptanceMode: string;
  usesCount: number;
  maxUses: number | null;
  expiresAtLabel: string | null;
}

/**
 * Lien d'invitation partageable actif (volet 3 de la 4B, checkpoint 1).
 *
 * "Générer un nouveau lien" passe par une confirmation (`AlertDialog`) avant
 * d'ouvrir le formulaire de configuration : un clic accidentel ne doit pas
 * exposer le formulaire sans prévenir que soumettre révoquera le lien déjà
 * partagé (brief 4B volet 3, point A).
 */
export function InviteLinkCard({
  orgSlug,
  link,
}: {
  orgSlug: string;
  link: ActiveInviteLink;
}) {
  const t = useTranslations("invitations.inviteLink");
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);

  const acceptanceMode = isInviteLinkAcceptanceMode(link.acceptanceMode)
    ? link.acceptanceMode
    : "auto";

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success(t("card.copySuccess"));
    } catch {
      toast.error(t("card.copyError"));
    }
  }

  function onRevoke() {
    startTransition(async () => {
      const result = await revokeOrganizationInviteLink(orgSlug, link.id);
      if (result.ok) {
        toast.success(t("revokeConfirm.success"));
        setRevokeOpen(false);
        router.refresh();
      } else {
        toast.error(t("revokeConfirm.error"));
      }
    });
  }

  function onConfirmRegenerate() {
    setRegenerateOpen(false);
    router.push(`${pathname}?generateLink=true`, { scroll: false });
  }

  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={acceptanceMode === "auto" ? "success" : "warning"}>
            {t(`card.mode${acceptanceMode === "auto" ? "Auto" : "Manual"}`)}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {link.maxUses !== null
              ? t("card.usesLabel", { count: link.usesCount, max: link.maxUses })
              : t("card.usesUnlimitedLabel", { count: link.usesCount })}
          </span>
          <span className="text-sm text-muted-foreground">
            {link.expiresAtLabel
              ? t("card.expiresLabel", { date: link.expiresAtLabel })
              : t("card.neverExpires")}
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 font-mono text-sm text-foreground">
            {link.url}
          </code>
          <Button type="button" variant="outline" onClick={onCopy}>
            <Copy />
            {t("card.copy")}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRegenerateOpen(true)}
          >
            {t("card.generateNew")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setRevokeOpen(true)}
          >
            {t("card.revoke")}
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("revokeConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("revokeConfirm.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRevokeOpen(false)}
              disabled={isPending}
            >
              {t("revokeConfirm.back")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onRevoke}
              disabled={isPending}
            >
              {isPending ? t("revokeConfirm.submitting") : t("revokeConfirm.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("regenerateConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("regenerateConfirm.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRegenerateOpen(false)}
            >
              {t("regenerateConfirm.back")}
            </Button>
            <Button type="button" onClick={onConfirmRegenerate}>
              {t("regenerateConfirm.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
