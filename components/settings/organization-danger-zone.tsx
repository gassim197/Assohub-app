"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { OrganizationDeletionStats } from "@/lib/organizations/queries";
import { Button } from "@/components/ui/button";
import { DeleteOrganizationDialog } from "./delete-organization-dialog";

interface OrganizationDangerZoneProps {
  orgSlug: string;
  organizationName: string;
  stats: OrganizationDeletionStats;
}

/**
 * Section "Zone de danger" de l'onglet Organisation — rendue uniquement pour
 * le `owner` (vérifié côté page, `getMemberRole`). Même traitement visuel que
 * `components/settings/danger-zone.tsx` (compte).
 */
export function OrganizationDangerZone({
  orgSlug,
  organizationName,
  stats,
}: OrganizationDangerZoneProps) {
  const t = useTranslations("settings.organizationDangerZone");
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-destructive">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <Button type="button" variant="destructive" onClick={() => setDialogOpen(true)}>
        {t("deleteButton")}
      </Button>

      <DeleteOrganizationDialog
        orgSlug={orgSlug}
        organizationName={organizationName}
        stats={stats}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
