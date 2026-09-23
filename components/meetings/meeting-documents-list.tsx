"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { AttachedDocumentRow } from "@/lib/documents/queries";
import { Button } from "@/components/ui/button";
import { AttachDocumentDialog } from "@/components/documents/attach-document-dialog";

/** Bouton « Ajouter un document » + dialog contrôlé, pour la fiche réunion (admin/owner uniquement). */
export function MeetingDocumentsList({
  orgSlug,
  meetingId,
  existingDocuments,
}: {
  orgSlug: string;
  meetingId: string;
  existingDocuments: AttachedDocumentRow[];
}) {
  const t = useTranslations("documents.meetingSection");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t("add")}
      </Button>
      <AttachDocumentDialog
        orgSlug={orgSlug}
        target={{ meetingId }}
        existingDocuments={existingDocuments}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
