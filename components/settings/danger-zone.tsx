"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { SoleOwnedOrganization } from "@/lib/organizations/queries";
import { Button } from "@/components/ui/button";
import { SoleOwnerBlockerDialog } from "./sole-owner-blocker-dialog";
import { DeleteAccountDialog } from "./delete-account-dialog";

interface DangerZoneProps {
  orgSlug: string;
  soleOwnedOrganizations: SoleOwnedOrganization[];
}

/**
 * Section "Zone de danger" — suppression de compte. Le statut "seul
 * propriétaire" est calculé côté serveur au chargement de la page
 * (`getUserSoleOwnedOrganizations`, re-vérifié aussi côté serveur dans
 * `deleteMyAccount`) : au clic, on route directement vers le dialogue
 * bloqueur ou la confirmation forte, sans aller-retour supplémentaire.
 */
export function DangerZone({ orgSlug, soleOwnedOrganizations }: DangerZoneProps) {
  const t = useTranslations("settings.dangerZone");
  const [dialogOpen, setDialogOpen] = useState(false);

  const isBlocked = soleOwnedOrganizations.length > 0;

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-destructive">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <Button
        type="button"
        variant="destructive"
        onClick={() => setDialogOpen(true)}
      >
        {t("deleteButton")}
      </Button>

      {isBlocked ? (
        <SoleOwnerBlockerDialog
          organizations={soleOwnedOrganizations}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      ) : (
        <DeleteAccountDialog
          orgSlug={orgSlug}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
}
