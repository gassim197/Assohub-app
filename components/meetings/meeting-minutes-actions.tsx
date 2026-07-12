"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { MeetingMinutesStatusDialog } from "./meeting-minutes-status-dialog";

/**
 * Bouton « Changer le statut » + dialog contrôlé (checkpoint 2), affiché à
 * côté du badge de statut du PV sur la fiche réunion.
 */
export function MeetingMinutesActions({
  orgSlug,
  minutesId,
  status,
}: {
  orgSlug: string;
  minutesId: string;
  status: string;
}) {
  const t = useTranslations("meetings.minutes");
  const [statusOpen, setStatusOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setStatusOpen(true)}>
        {t("changeStatus")}
      </Button>
      <MeetingMinutesStatusDialog
        orgSlug={orgSlug}
        minutesId={minutesId}
        status={status}
        open={statusOpen}
        onOpenChange={setStatusOpen}
      />
    </>
  );
}
